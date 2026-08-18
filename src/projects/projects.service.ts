import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProjectStatus, ApplicationStatus, Role } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async getAllProjects() {
    return this.prisma.project.findMany({
      include: {
        application: {
          include: {
            applicant: { select: { name: true, email: true } },
          },
        },
        feedback: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProjectById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            applicant: { select: { name: true, email: true } },
          },
        },
        feedback: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async updateProject(
    id: string,
    data: {
      status?: ProjectStatus;
      scope?: string;
      requirements?: string;
      deploymentUrl?: string;
      notes?: string;
    },
    adminId: string
  ) {
    const existing = await this.getProjectById(id);

    const updated = await this.prisma.project.update({
      where: { id },
      data,
    });

    // Audit log
    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE_PROJECT',
      details: `Updated project for application ${existing.applicationId} (Status: ${existing.status} -> ${updated.status})`,
      applicationId: existing.applicationId,
    });

    // If status is updated to COMPLETED / FEEDBACK_PENDING, we can trigger application status shifts
    if (data.status) {
      let appStatus: ApplicationStatus | null = null;
      if (data.status === ProjectStatus.COMPLETED) {
        appStatus = ApplicationStatus.PROJECT_COMPLETED;
      } else if (data.status === ProjectStatus.DEVELOPMENT || data.status === ProjectStatus.TESTING || data.status === ProjectStatus.DEPLOYED) {
        appStatus = ApplicationStatus.PROJECT_ACTIVE;
      }

      if (appStatus) {
        await this.prisma.application.update({
          where: { id: existing.applicationId },
          data: { status: appStatus },
        });
      }
    }

    return updated;
  }

  async submitFeedback(
    userId: string,
    data: {
      projectId: string;
      rating: number;
      writtenFeedback: string;
      testimonial?: string;
      videoTestimonialUrl?: string;
      permissionToPublish: boolean;
      permissionToUseLogo: boolean;
      permissionToUseProject: boolean;
    }
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
      include: { application: true },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${data.projectId} not found`);
    }

    // Verify user owns the project application
    if (project.application.applicantId !== userId) {
      throw new ForbiddenException('Access denied. You can only submit feedback for your own project.');
    }

    // Check if feedback already exists
    const existingFeedback = await this.prisma.feedback.findUnique({
      where: { projectId: data.projectId },
    });

    if (existingFeedback) {
      throw new BadRequestException('Feedback has already been submitted for this project.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create feedback
      const feedback = await tx.feedback.create({
        data: {
          projectId: data.projectId,
          rating: data.rating,
          writtenFeedback: data.writtenFeedback,
          testimonial: data.testimonial || null,
          videoTestimonialUrl: data.videoTestimonialUrl || null,
          permissionToPublish: data.permissionToPublish,
          permissionToUseLogo: data.permissionToUseLogo,
          permissionToUseProject: data.permissionToUseProject,
        },
      });

      // Update project status to COMPLETED
      await tx.project.update({
        where: { id: data.projectId },
        data: {
          status: ProjectStatus.COMPLETED,
        },
      });

      // Update application status to PROJECT_COMPLETED
      await tx.application.update({
        where: { id: project.applicationId },
        data: {
          status: ApplicationStatus.PROJECT_COMPLETED,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'SUBMIT_FEEDBACK',
          details: `Applicant submitted feedback for project ${data.projectId}`,
          applicationId: project.applicationId,
        },
      });

      return feedback;
    });
  }

  async getSuccessStories() {
    return this.prisma.project.findMany({
      where: {
        status: ProjectStatus.COMPLETED,
        feedback: {
          permissionToPublish: true,
        },
      },
      include: {
        application: {
          select: {
            businessName: true,
            businessType: true,
            location: true,
          },
        },
        feedback: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getAdminFeedbacks() {
    return this.prisma.feedback.findMany({
      include: {
        project: {
          include: {
            application: {
              select: {
                businessName: true,
                email: true,
                applicant: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async updateFeedbackAdmin(
    id: string,
    updateData: {
      rating?: number;
      writtenFeedback?: string;
      testimonial?: string;
      permissionToPublish?: boolean;
      permissionToUseLogo?: boolean;
      permissionToUseProject?: boolean;
    }
  ) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    return this.prisma.feedback.update({
      where: { id },
      data: updateData,
    });
  }
}
