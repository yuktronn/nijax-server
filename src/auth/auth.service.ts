import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService
  ) {}

  async validateUser(email: string, pass?: string): Promise<any> {
    const emailLower = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user) {
      throw new UnauthorizedException('No account found with this email address');
    }

    // Bypass password check for applicants to enable email-only application tracking
    if (user.role === 'APPLICANT') {
      const userApplications = await this.prisma.application.findMany({
        where: { applicantId: user.id },
      });
      if (userApplications.length === 0) {
        throw new UnauthorizedException('No pilot application found for this email address');
      }
      const { passwordHash, ...result } = user;
      return result;
    }

    // Enforce password verification for admin users
    if (!pass) {
      throw new UnauthorizedException('Password is required for admin accounts');
    }
    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any, ipAddress?: string) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    // Log auth action
    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      details: `${user.role} logged in`,
      ipAddress,
    });

    let applicationId: string | null = null;
    if (user.role === 'APPLICANT') {
      const userApplications = await this.prisma.application.findMany({
        where: { applicantId: user.id },
        orderBy: { submittedAt: 'desc' },
        take: 1,
      });
      applicationId = userApplications[0]?.id || null;
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        applicationId,
      },
    };
  }

  async generateMagicToken(userId: string, email: string, role: string): Promise<string> {
    // Generate a token that lasts 30 days so tracking link doesn't expire too quickly
    return this.jwtService.sign(
      { email, sub: userId, role },
      { expiresIn: '30d' }
    );
  }

  async verifyMagicToken(token: string, ipAddress?: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      await this.auditService.log({
        userId: user.id,
        action: 'MAGIC_LOGIN',
        details: 'User authenticated via magic link token',
        ipAddress,
      });

      const { passwordHash, ...result } = user;
      return {
        access_token: token, // Re-use the existing token or we could sign a new one
        user: result,
      };
    } catch (err: any) {
      throw new UnauthorizedException('Invalid or expired tracking token');
    }
  }
}
