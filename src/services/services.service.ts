import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  // Get only active, non-deleted services for public Digital Pilot page
  async getActiveServices() {
    return this.prisma.service.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  // Get all services (active/inactive/soft-deleted) for admin view
  async getAllAdminServices() {
    return this.prisma.service.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async getServiceById(id: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async createService(
    data: {
      name: string;
      shortDescription: string;
      description: string;
      icon: string;
      aiContext?: string;
      isActive?: boolean;
      displayOrder?: number;
    },
    adminId: string
  ) {
    // Generate unique slug
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await this.prisma.service.findFirst({
      where: {
        OR: [
          { slug },
          { name: { equals: data.name, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(`A service with the name or slug '${data.name}' already exists.`);
    }

    const service = await this.prisma.service.create({
      data: {
        name: data.name,
        slug,
        shortDescription: data.shortDescription,
        description: data.description,
        icon: data.icon || 'FiLayers',
        aiContext: data.aiContext || '',
        isActive: data.isActive !== undefined ? data.isActive : true,
        displayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder as any, 10) : 0,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'CREATE_SERVICE',
      details: `Created new service: ${service.name} (Slug: ${service.slug})`,
    });

    return service;
  }

  async updateService(
    id: string,
    data: {
      name?: string;
      shortDescription?: string;
      description?: string;
      icon?: string;
      aiContext?: string;
      isActive?: boolean;
      displayOrder?: number;
    },
    adminId: string
  ) {
    const service = await this.getServiceById(id);

    const updatePayload: any = { ...data };

    if (data.name && data.name !== service.name) {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = await this.prisma.service.findFirst({
        where: {
          slug,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existing) {
        throw new BadRequestException(`A service with slug '${slug}' already exists.`);
      }

      updatePayload.name = data.name;
      updatePayload.slug = slug;
    }

    if (data.displayOrder !== undefined) {
      updatePayload.displayOrder = parseInt(data.displayOrder as any, 10);
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: updatePayload,
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE_SERVICE',
      details: `Updated service ${service.name}: ${Object.keys(data).join(', ')}`,
    });

    return updated;
  }

  async softDeleteService(id: string, adminId: string) {
    const service = await this.getServiceById(id);

    // Soft delete by updating deletedAt timestamp
    await this.prisma.service.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'DELETE_SERVICE',
      details: `Soft-deleted service: ${service.name}`,
    });

    return { success: true };
  }
}
