import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  async sendOtp(email: string) {
    const emailLower = email.toLowerCase().trim();

    // 1. Rate Limit / Cooldown check (60 seconds resend cooldown)
    const existing = await this.prisma.otpVerification.findUnique({
      where: { email: emailLower },
    });

    if (existing) {
      const timeSinceLastUpdate = Date.now() - existing.updatedAt.getTime();
      const cooldownMs = 60 * 1000; // 60 seconds
      if (timeSinceLastUpdate < cooldownMs) {
        const secondsRemaining = Math.ceil((cooldownMs - timeSinceLastUpdate) / 1000);
        throw new BadRequestException(`Please wait ${secondsRemaining} seconds before requesting a new code.`);
      }
    }

    // 2. Generate 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Hash code using bcrypt
    const codeHash = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 4. Update or create verification record
    await this.prisma.otpVerification.upsert({
      where: { email: emailLower },
      update: {
        codeHash,
        expiresAt,
        attempts: 0,
      },
      create: {
        email: emailLower,
        codeHash,
        expiresAt,
        attempts: 0,
      },
    });

    // 5. Send OTP email
    const emailSent = await this.sendOtpEmail(emailLower, otpCode);
    if (!emailSent) {
      throw new InternalServerErrorException('Failed to deliver verification code to your email. Please try again.');
    }

    return { success: true, message: 'Verification code sent successfully.' };
  }

  async verifyOtp(email: string, code: string) {
    const emailLower = email.toLowerCase().trim();

    // 1. Fetch OTP record
    const otpRecord = await this.prisma.otpVerification.findUnique({
      where: { email: emailLower },
    });

    if (!otpRecord) {
      throw new BadRequestException('No verification code was sent to this email or it has expired.');
    }

    // 2. Expiry check
    if (Date.now() > otpRecord.expiresAt.getTime()) {
      await this.prisma.otpVerification.delete({ where: { email: emailLower } }).catch(() => {});
      throw new BadRequestException('The verification code has expired. Please request a new one.');
    }

    // 3. Max attempts check (5 attempts)
    if (otpRecord.attempts >= 5) {
      await this.prisma.otpVerification.delete({ where: { email: emailLower } }).catch(() => {});
      throw new BadRequestException('Too many incorrect verification attempts. Please request a new code.');
    }

    // 4. Code comparison
    const isMatch = await bcrypt.compare(code, otpRecord.codeHash);

    if (!isMatch) {
      // Increment attempts
      const updated = await this.prisma.otpVerification.update({
        where: { email: emailLower },
        data: { attempts: { increment: 1 } },
      });

      if (updated.attempts >= 5) {
        await this.prisma.otpVerification.delete({ where: { email: emailLower } }).catch(() => {});
        throw new BadRequestException('Too many incorrect verification attempts. Please request a new code.');
      }

      const remaining = 5 - updated.attempts;
      throw new BadRequestException(`Invalid verification code. You have ${remaining} attempts remaining.`);
    }

    // 5. One-time use: Delete verification record on success
    await this.prisma.otpVerification.delete({
      where: { email: emailLower },
    });

    return { success: true, message: 'Email verified successfully.' };
  }

  private async sendOtpEmail(email: string, code: string): Promise<boolean> {
    const subject = 'Verify your Yuktron Digital Pilot application';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0d1b2a; border-bottom: 2px solid #00b4d8; padding-bottom: 10px;">Yuktron Digital Pilot</h2>
        <p>Dear Applicant,</p>
        <p>Your Yuktron Digital Pilot verification code is:</p>
        <div style="background-color: #f8f9fa; padding: 15px 30px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px dashed #00b4d8;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0077b6;">${code}</span>
        </div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #ef4444; font-weight: bold;">Do not share this code with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #8d99ae; text-align: center;">Yuktron Digital Solutions &copy; 2026. All rights reserved.</p>
      </div>
    `;

    return this.emailService.sendMail(email, 'OTP_VERIFICATION', subject, htmlContent);
  }
}
