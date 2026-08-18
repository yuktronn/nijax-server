import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    action: string;
    details?: string;
    ipAddress?: string;
    applicationId?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          details: params.details || null,
          ipAddress: params.ipAddress || null,
          applicationId: params.applicationId || null,
        },
      });
      this.logger.log(`[AUDIT LOG] Action: ${params.action} | Details: ${params.details || 'None'}`);
    } catch (err: any) {
      this.logger.error(`Failed to write audit log: ${err.message}`);
    }
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        application: {
          select: {
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
