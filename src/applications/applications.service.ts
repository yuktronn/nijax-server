import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { ApplicationStatus, CycleStatus, LeadStatus, ProjectStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private auditService: AuditService,
    private authService: AuthService
  ) {}

  async submitApplication(data: {
    pilotCycleId: string;
    businessName: string;
    businessType: string;
    businessDescription?: string;
    website?: string;
    phone: string;
    email: string;
    location: string;
    targetAudience: string;
    requestedSolution: string;
    businessChallenge: string;
    applicantName: string;
    applicantDesignation: string;
    referralSource: string;
  }, ipAddress?: string) {
    // 1. Verify cycle is open
    const cycle = await this.prisma.pilotCycle.findUnique({
      where: { id: data.pilotCycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Pilot cycle not found');
    }

    if (cycle.status !== CycleStatus.OPEN) {
      throw new BadRequestException('Applications are currently closed for this cycle');
    }

    // 2. Duplicate detection: Check if email already submitted for this cycle
    const duplicate = await this.prisma.application.findFirst({
      where: {
        pilotCycleId: data.pilotCycleId,
        email: data.email,
      },
    });

    if (duplicate) {
      throw new BadRequestException('An application with this email has already been submitted for this cycle.');
    }

    // 3. User account provisioning
    let user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      // Create account
      const tempPassword = Math.random().toString(36).slice(-8); // Random string
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      user = await this.prisma.user.create({
        data: {
          name: data.applicantName,
          email: data.email,
          phone: data.phone,
          passwordHash,
          role: Role.APPLICANT,
        },
      });

      await this.auditService.log({
        userId: user.id,
        action: 'REGISTER_APPLICANT',
        details: `Auto-registered applicant user account: ${data.email}`,
        ipAddress,
      });
    }

    // 4. Create application
    const application = await this.prisma.application.create({
      data: {
        pilotCycleId: data.pilotCycleId,
        applicantId: user.id,
        businessName: data.businessName,
        businessType: data.businessType,
        businessDescription: data.businessDescription || data.businessChallenge || 'No business description provided.',
        website: data.website || null,
        phone: data.phone,
        email: data.email,
        location: data.location,
        targetAudience: data.targetAudience,
        requestedSolution: data.requestedSolution,
        businessChallenge: data.businessChallenge,
        referralSource: data.referralSource,
        status: ApplicationStatus.SUBMITTED,
        leadStatus: LeadStatus.NEW_LEAD, // Automatically mark as new CRM lead
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'SUBMIT_APPLICATION',
      details: `Submitted pilot application for ${data.businessName}`,
      ipAddress,
      applicationId: application.id,
    });

    // 5. Generate secure magic tracking link
    const magicToken = await this.authService.generateMagicToken(user.id, user.email, user.role);

    // 6. Trigger confirmation email
    const cycleMonthStr = `${cycle.name}`;
    await this.emailService.sendApplicationReceived(
      data.email,
      data.applicantName,
      data.businessName,
      application.id,
      cycleMonthStr
    );

    return {
      applicationId: application.id,
      magicToken,
      status: application.status,
    };
  }

  async getApplicationById(id: string, user: { id: string; role: Role }) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        pilotCycle: true,
        project: {
          include: {
            feedback: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    // Enforce authorization: Applicant can only view their own
    if (user.role === Role.APPLICANT && application.applicantId !== user.id) {
      throw new ForbiddenException('Access denied. You can only track your own application.');
    }

    return application;
  }

  async getAdminApplications(filters: {
    cycleId?: string;
    status?: ApplicationStatus;
    leadStatus?: LeadStatus;
    search?: string;
    location?: string;
    businessType?: string;
    requestedSolution?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) {
    const whereClause: any = {};

    if (filters.cycleId) {
      whereClause.pilotCycleId = filters.cycleId;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }
    if (filters.leadStatus) {
      whereClause.leadStatus = filters.leadStatus;
    }
    if (filters.location) {
      whereClause.location = { contains: filters.location, mode: 'insensitive' };
    }
    if (filters.businessType) {
      whereClause.businessType = filters.businessType;
    }
    if (filters.requestedSolution) {
      whereClause.requestedSolution = filters.requestedSolution;
    }
    if (filters.priority) {
      whereClause.priority = filters.priority;
    }
    if (filters.search) {
      whereClause.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { businessName: { contains: filters.search, mode: 'insensitive' } },
        { applicant: { name: { contains: filters.search, mode: 'insensitive' } } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters.page ? parseInt(filters.page as any, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit as any, 10) : 100;
    const skip = (page - 1) * limit;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.application.count({ where: whereClause }),
      this.prisma.application.findMany({
        where: whereClause,
        include: {
          applicant: {
            select: { name: true, phone: true },
          },
          pilotCycle: true,
          selection: true,
          project: true,
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async updateApplicationAdminFields(
    id: string,
    updateData: {
      status?: ApplicationStatus;
      leadStatus?: LeadStatus;
      notes?: string;
      priority?: string;
      rejectionReason?: string;
    },
    adminId: string
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE_APPLICATION_ADMIN',
      details: `Admin updated fields on application for ${application.businessName}: ${Object.keys(updateData).join(', ')}`,
      applicationId: id,
    });

    return updated;
  }

  async updateApplicationStatus(id: string, status: ApplicationStatus, adminId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { applicant: true },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: { status },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE_STATUS',
      details: `Updated application for ${application.businessName} status to ${status}`,
      applicationId: id,
    });

    return updated;
  }

  async updateLeadStatus(id: string, leadStatus: LeadStatus, adminId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: { leadStatus },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE_LEAD_STATUS',
      details: `Updated CRM lead status for ${application.businessName} to ${leadStatus}`,
      applicationId: id,
    });

    return updated;
  }

  async selectWinner(id: string, notes: string, adminId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        pilotCycle: true,
        applicant: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    const cycleId = application.pilotCycleId;

    // Check if a winner has already been selected for this cycle
    const winnerSelected = await this.prisma.selection.findFirst({
      where: {
        application: {
          pilotCycleId: cycleId,
        },
      },
    });

    if (winnerSelected) {
      throw new BadRequestException('A winner has already been selected and locked for this monthly pilot cycle.');
    }

    // Execute winner selection in a transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Create selection record
      const selection = await tx.selection.create({
        data: {
          applicationId: id,
          adminId,
          notes,
        },
      });

      // 2. Set this application status to SELECTED
      const updatedApp = await tx.application.update({
        where: { id },
        data: {
          status: ApplicationStatus.SELECTED,
          leadStatus: LeadStatus.WON,
        },
      });

      // 3. Set other applications in same cycle to NOT_SELECTED
      await tx.application.updateMany({
        where: {
          pilotCycleId: cycleId,
          id: { not: id },
        },
        data: {
          status: ApplicationStatus.NOT_SELECTED,
          leadStatus: LeadStatus.LOST, // CRM pipeline update
        },
      });

      // 4. Update the cycle status to WINNER_SELECTED
      await tx.pilotCycle.update({
        where: { id: cycleId },
        data: {
          status: CycleStatus.WINNER_SELECTED,
        },
      });

      // 5. Create a project record in PLANNING state
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 30); // 30 days build window

      await tx.project.create({
        data: {
          applicationId: id,
          projectType: application.requestedSolution,
          scope: `Custom ${application.requestedSolution} built for ${application.businessName}`,
          startDate: new Date(),
          targetCompletionDate: targetDate,
          status: ProjectStatus.PLANNING,
          requirements: `Core challenge: ${application.businessChallenge}\nTarget Audience: ${application.targetAudience}`,
        },
      });

      // Log in AuditLog
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'SELECT_WINNER',
          details: `Selected ${application.businessName} as Winner of ${application.pilotCycle.name}`,
          applicationId: id,
        },
      });

      // 6. Trigger emails asynchronously (outside transaction block but initiated here)
      // Send congrats email
      await this.emailService.sendApplicationSelected(
        application.email,
        application.applicant.name,
        application.businessName,
        application.id
      );

      // Fetch other applications to send rejection letters
      const nonWinners = await tx.application.findMany({
        where: {
          pilotCycleId: cycleId,
          id: { not: id },
        },
        include: { applicant: true },
      });

      for (const nonWinner of nonWinners) {
        await this.emailService.sendApplicationNotSelected(
          nonWinner.email,
          nonWinner.applicant.name,
          nonWinner.businessName,
          nonWinner.requestedSolution
        );
      }

      return updatedApp;
    });
  }
}
