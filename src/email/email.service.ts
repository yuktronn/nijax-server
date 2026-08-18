import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private prisma: PrismaService) {
    const resendApiKey = process.env.EMAIL_API_KEY || '';
    if (resendApiKey && resendApiKey !== 'mock_key') {
      this.resend = new Resend(resendApiKey);
      this.logger.log('Resend Email Transporter service configured successfully');
    }

    const smtpHost = process.env.SMTP_HOST || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';

    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log(`SMTP Email Transporter configured at ${smtpHost}:${smtpPort}`);
    } else {
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.logger.log('Fallback JSON Mail Transporter configured for development/testing');
    }
  }

  async sendMail(
    recipient: string,
    emailType: string,
    subject: string,
    htmlContent: string,
    applicationId?: string
  ): Promise<boolean> {
    const fromAddress = process.env.EMAIL_FROM || 'no-reply@yuktron.com';
    
    // Create pre-log in DB
    const log = await this.prisma.emailLog.create({
      data: {
        recipient,
        emailType,
        status: 'SENDING',
        applicationId: applicationId || null,
      },
    });

    try {
      if (this.resend) {
        await this.resend.emails.send({
          from: `Yuktron Digital <${fromAddress}>`,
          to: recipient,
          subject: subject,
          html: htmlContent,
        });
      } else {
        const info = await this.transporter.sendMail({
          from: `"Yuktron Digital" <${fromAddress}>`,
          to: recipient,
          subject,
          html: htmlContent,
        });

        if (info && (info as any).message) {
          this.logger.debug(`[MOCK EMAIL SENT] Recipient: ${recipient} | Subject: ${subject}`);
          this.logger.debug(`[HTML CONTENT]:\n${htmlContent}`);
        }
      }

      // Update log to SENT
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
        },
      });

      this.logger.log(`Email of type ${emailType} sent to ${recipient}`);

      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${recipient}: ${err.message}`);
      
      // Update log to FAILED
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          error: err.message || 'Unknown error occurred',
        },
      });

      return false;
    }
  }

  // Template utilities for the different types of emails
  async sendApplicationReceived(email: string, name: string, businessName: string, appId: string, cycleMonth: string) {
    const trackLink = `${process.env.FRONTEND_URL}/dashboard?appId=${appId}`;
    const subject = `Your Yuktron Digital Pilot application has been received`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0d1b2a; border-bottom: 2px solid #00b4d8; padding-bottom: 10px;">Yuktron Digital Pilot</h2>
        <p>Dear ${name},</p>
        <p>Thank you for applying for the <strong>Yuktron Digital Pilot Program</strong> for <strong>${cycleMonth}</strong>.</p>
        <p>We have successfully received the application details for <strong>${businessName}</strong> (Application ID: <code>${appId}</code>).</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0d1b2a;">Application Summary</h4>
          <ul style="margin-bottom: 0;">
            <li><strong>Business Name:</strong> ${businessName}</li>
            <li><strong>Application ID:</strong> ${appId}</li>
            <li><strong>Current Status:</strong> Submitted & Verifying</li>
            <li><strong>Cycle:</strong> ${cycleMonth}</li>
          </ul>
        </div>
        <p>Our team, along with NIJAX (our digital assistant), is currently verifying eligibility and analysis requirements. You can track the progress of your application live on your dashboard.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${trackLink}" style="background-color: #0077b6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Application Status</a>
        </div>
        <p style="color: #6c757d; font-size: 13px;">If you have any questions, feel free to contact us at support@yuktron.com.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #8d99ae; text-align: center;">Yuktron Digital Solutions &copy; 2026. All rights reserved.</p>
      </div>
    `;

    return this.sendMail(email, 'APPLICATION_RECEIVED', subject, html, appId);
  }

  async sendApplicationSelected(email: string, name: string, businessName: string, appId: string) {
    const requirementLink = `${process.env.FRONTEND_URL}/dashboard?appId=${appId}`;
    const subject = `Congratulations! Your business has been selected for the Yuktron Digital Pilot`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f0fdf4;">
        <h2 style="color: #14532d; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">Winner Selected! 🎉</h2>
        <p>Dear ${name},</p>
        <p>We are absolutely thrilled to inform you that <strong>${businessName}</strong> has been selected for the **Yuktron Digital Pilot**! 🚀</p>
        <p>Every month, we select exactly one business to build a custom digital solution at ₹0, and this month, it is you.</p>
        <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h4 style="margin-top: 0; color: #14532d;">Next Steps</h4>
          <ol>
            <li>We need to schedule a requirement discussion to lock down the exact scope of your solution.</li>
            <li>Our engineering team will begin the Design & Development phase immediately after scoping.</li>
          </ol>
        </div>
        <p>Please check your dashboard to lock in your discussion slot or connect with our lead developer:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${requirementLink}" style="background-color: #16a34a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Project Dashboard</a>
        </div>
        <p>Welcome to the program. Let's build something remarkable together!</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #8d99ae; text-align: center;">Yuktron Digital Solutions &copy; 2026. All rights reserved.</p>
      </div>
    `;

    return this.sendMail(email, 'APPLICATION_SELECTED', subject, html, appId);
  }

  async sendApplicationNotSelected(email: string, name: string, businessName: string, requestedSolution: string) {
    const contactLink = `${process.env.FRONTEND_URL}/contact?ref=pilot-non-select&solution=${encodeURIComponent(requestedSolution)}`;
    const subject = `Update on your Yuktron Digital Pilot application`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0d1b2a; border-bottom: 2px solid #00b4d8; padding-bottom: 10px;">Yuktron Digital Pilot Update</h2>
        <p>Dear ${name},</p>
        <p>Thank you once again for applying for the Yuktron Digital Pilot Program on behalf of <strong>${businessName}</strong>.</p>
        <p>We received many incredible applications this month, and unfortunately, <strong>your business was not selected for this month's ₹0 pilot</strong>. Since our scope is strictly limited to one business per month, making the decision was extremely difficult.</p>
        <p>However, we carefully analyzed your request for a <strong>${requestedSolution}</strong>. Your requirements align closely with what Yuktron builds, and we would love to help you bring it to life as a commercial project.</p>
        <p>If you're interested in discussing how we can build this for you at a highly competitive rate, let's setup a quick call:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${contactLink}" style="background-color: #0077b6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Discuss My Requirement</a>
        </div>
        <p>Thank you for your time, interest, and support. We wish your business the absolute best and will keep you in our CRM for future program updates.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #8d99ae; text-align: center;">Yuktron Digital Solutions &copy; 2026. All rights reserved.</p>
      </div>
    `;

    return this.sendMail(email, 'APPLICATION_NOT_SELECTED', subject, html);
  }

  async getEmailLogs() {
    return this.prisma.emailLog.findMany({
      include: {
        application: {
          select: {
            businessName: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  async retryEmail(id: string) {
    const log = await this.prisma.emailLog.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            applicant: true,
            pilotCycle: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`Email log with ID ${id} not found`);
    }

    let success = false;

    if (log.emailType === 'APPLICATION_RECEIVED' && log.application) {
      success = await this.sendApplicationReceived(
        log.recipient,
        log.application.applicant.name,
        log.application.businessName,
        log.application.id,
        log.application.pilotCycle.name
      );
    } else if (log.emailType === 'APPLICATION_SELECTED' && log.application) {
      success = await this.sendApplicationSelected(
        log.recipient,
        log.application.applicant.name,
        log.application.businessName,
        log.application.id
      );
    } else if (log.emailType === 'APPLICATION_NOT_SELECTED' && log.application) {
      success = await this.sendApplicationNotSelected(
        log.recipient,
        log.application.applicant.name,
        log.application.businessName,
        log.application.requestedSolution
      );
    } else {
      success = await this.sendMail(
        log.recipient,
        log.emailType,
        `Retried: Notification Alert`,
        `<p>This is a retried notification for ${log.emailType}.</p>`,
        log.applicationId || undefined
      );
    }

    return { success };
  }
}
