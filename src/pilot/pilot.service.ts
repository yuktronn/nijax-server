import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CycleStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PilotService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async getCurrentCycle() {
    // Look for an OPEN cycle
    let cycle = await this.prisma.pilotCycle.findFirst({
      where: { status: CycleStatus.OPEN },
      orderBy: { applicationEndAt: 'asc' },
    });

    // If none open, look for UNDER_REVIEW or other active cycle
    if (!cycle) {
      cycle = await this.prisma.pilotCycle.findFirst({
        where: {
          status: {
            in: [
              CycleStatus.UNDER_REVIEW,
              CycleStatus.SELECTION_PENDING,
              CycleStatus.WINNER_SELECTED,
              CycleStatus.PROJECT_ACTIVE,
            ],
          },
        },
        orderBy: { selectionAt: 'desc' },
      });
    }

    // Fallback: get the latest cycle created
    if (!cycle) {
      cycle = await this.prisma.pilotCycle.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }

    const latestSelected = await this.prisma.application.findFirst({
      where: {
        status: {
          in: ['SELECTED', 'PROJECT_COMPLETED']
        }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        applicant: {
          select: {
            name: true,
          },
        },
      },
    });

    const latestWinner = latestSelected ? {
      id: latestSelected.id,
      businessName: latestSelected.businessName,
      requestedSolution: latestSelected.requestedSolution,
      ownerName: latestSelected.applicant?.name || latestSelected.email,
    } : {
      id: "mock-latest-winner-id",
      businessName: "FlowNest Cafe & Bakery",
      requestedSolution: "Business CRM & Automation System",
      ownerName: "Rahul Dev",
    };

    const result: any = cycle ? { ...cycle } : null;

    if (cycle && (cycle.status === 'WINNER_SELECTED' || cycle.status === 'PROJECT_ACTIVE')) {
      const winner = await this.prisma.application.findFirst({
        where: {
          pilotCycleId: cycle.id,
          status: {
            in: ['SELECTED', 'PROJECT_COMPLETED']
          },
        },
        select: {
          id: true,
          businessName: true,
          requestedSolution: true,
          email: true,
          applicant: {
            select: {
              name: true,
            },
          },
        },
      });
      if (result) {
        result.winner = winner ? {
          id: winner.id,
          businessName: winner.businessName,
          requestedSolution: winner.requestedSolution,
          ownerName: winner.applicant?.name || winner.email,
        } : {
          id: "mock-active-winner-id",
          businessName: "Yuktron Solutions Lab",
          requestedSolution: "Custom Website & Client Portal",
          ownerName: "Gunaselan S",
        };
      }
    }

    if (result) {
      result.latestWinner = latestWinner;
    }

    return result;
  }

  async getCycleById(id: string) {
    const cycle = await this.prisma.pilotCycle.findUnique({
      where: { id },
    });
    if (!cycle) {
      throw new NotFoundException(`Pilot cycle with ID ${id} not found`);
    }
    return cycle;
  }

  async getAllCycles() {
    return this.prisma.pilotCycle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  async createCycle(data: {
    name: string;
    month: number;
    year: number;
    applicationStartAt: Date;
    applicationEndAt: Date;
    selectionAt: Date;
    status?: CycleStatus;
    eligibleLocation?: string;
    projectCategories?: string;
    monthlyProjectLimit?: number;
  }, adminId: string) {
    const cycle = await this.prisma.pilotCycle.create({
      data: {
        name: data.name,
        month: data.month !== undefined ? parseInt(data.month as any, 10) : data.month,
        year: data.year !== undefined ? parseInt(data.year as any, 10) : data.year,
        status: data.status || CycleStatus.DRAFT,
        applicationStartAt: new Date(data.applicationStartAt),
        applicationEndAt: new Date(data.applicationEndAt),
        selectionAt: new Date(data.selectionAt),
        eligibleLocation: data.eligibleLocation,
        projectCategories: data.projectCategories,
        monthlyProjectLimit: data.monthlyProjectLimit !== undefined ? parseInt(data.monthlyProjectLimit as any, 10) : undefined,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'CREATE_CYCLE',
      details: `Created pilot cycle: ${cycle.name}`,
    });

    return cycle;
  }

  async updateCycle(
    id: string,
    data: {
      name?: string;
      month?: number;
      year?: number;
      applicationStartAt?: Date;
      applicationEndAt?: Date;
      selectionAt?: Date;
      status?: CycleStatus;
      eligibleLocation?: string;
      projectCategories?: string;
      monthlyProjectLimit?: number;
    },
    adminId: string
  ) {
    const existing = await this.getCycleById(id);

    const updated = await this.prisma.pilotCycle.update({
      where: { id },
      data: {
        name: data.name,
        month: data.month !== undefined ? parseInt(data.month as any, 10) : undefined,
        year: data.year !== undefined ? parseInt(data.year as any, 10) : undefined,
        status: data.status,
        applicationStartAt: data.applicationStartAt ? new Date(data.applicationStartAt) : undefined,
        applicationEndAt: data.applicationEndAt ? new Date(data.applicationEndAt) : undefined,
        selectionAt: data.selectionAt ? new Date(data.selectionAt) : undefined,
        eligibleLocation: data.eligibleLocation,
        projectCategories: data.projectCategories,
        monthlyProjectLimit: data.monthlyProjectLimit !== undefined ? parseInt(data.monthlyProjectLimit as any, 10) : undefined,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE_CYCLE',
      details: `Updated pilot cycle ${existing.name} (Status: ${existing.status} -> ${updated.status})`,
    });

    return updated;
  }

  // --- Campaign Settings Operations ---
  async getCampaignSettings() {
    let settings = await this.prisma.campaignSettings.findUnique({
      where: { id: 'default' },
    });

    // Fallback if not seeded yet
    if (!settings) {
      const start = new Date();
      const end = new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000);
      settings = await this.prisma.campaignSettings.create({
        data: {
          id: 'default',
          campaignTitle: 'Your business could be our next Digital Pilot.',
          campaignSubtitle: 'Each month, Yuktron selects one business for a Digital Pilot.',
          selectionCount: 1,
          offerMessage: 'Selected businesses receive the pilot at no project cost.',
          supportingMessage: 'Selected businesses receive the pilot at no project cost.',
          applicationOpen: start,
          applicationClose: end,
          isActive: true,
        },
      });
    }

    return settings;
  }

  async updateCampaignSettings(
    data: {
      campaignTitle?: string;
      campaignSubtitle?: string;
      selectionCount?: number;
      offerMessage?: string;
      supportingMessage?: string;
      applicationOpen?: Date;
      applicationClose?: Date;
      isActive?: boolean;
    },
    adminId: string
  ) {
    const existing = await this.getCampaignSettings();

    const updated = await this.prisma.campaignSettings.update({
      where: { id: 'default' },
      data: {
        campaignTitle: data.campaignTitle,
        campaignSubtitle: data.campaignSubtitle,
        selectionCount: data.selectionCount !== undefined ? parseInt(data.selectionCount as any, 10) : undefined,
        offerMessage: data.offerMessage,
        supportingMessage: data.supportingMessage,
        applicationOpen: data.applicationOpen ? new Date(data.applicationOpen) : undefined,
        applicationClose: data.applicationClose ? new Date(data.applicationClose) : undefined,
        isActive: data.isActive,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE_CAMPAIGN_SETTINGS',
      details: `Updated campaign settings: ${Object.keys(data).join(', ')}`,
    });

    return updated;
  }
}
