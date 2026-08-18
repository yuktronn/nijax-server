import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuditService } from './audit/audit.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { CurrentUser } from './auth/decorators/user.decorator';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getSettings(@CurrentUser() user: any) {
    const admin = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });
    const cycleDefaults = {
      eligibleLocation: 'Chennai',
      projectCategories: 'Website, CRM, Booking System, Automation',
      monthlyProjectLimit: 1,
    };
    return { admin, cycleDefaults };
  }

  @Patch('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateSettings(@CurrentUser() user: any, @Body() body: any) {
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }
    
    const admin = await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: { name: true, email: true },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'UPDATE_SETTINGS',
      details: 'Admin updated profile/password settings',
    });

    return { success: true, admin };
  }
}
