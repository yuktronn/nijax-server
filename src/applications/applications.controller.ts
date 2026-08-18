import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { Role, ApplicationStatus, LeadStatus } from '@prisma/client';

@Controller()
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  // ----------------------------------------------------
  // PUBLIC & APPLICANT ENDPOINTS (Prefix: pilot)
  // ----------------------------------------------------
  
  @Post('pilot/applications')
  @HttpCode(HttpStatus.CREATED)
  async submitApplication(@Body() body: any, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.applicationsService.submitApplication(body, ipAddress);
  }

  @Get('pilot/applications/:id')
  @UseGuards(JwtAuthGuard)
  async trackApplication(@Param('id') id: string, @CurrentUser() user: any) {
    return this.applicationsService.getApplicationById(id, user);
  }

  // ----------------------------------------------------
  // ADMIN CONTROL ENDPOINTS (Prefix: admin)
  // ----------------------------------------------------

  @Get('admin/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAdminApplications(
    @Query('cycleId') cycleId?: string,
    @Query('status') status?: ApplicationStatus,
    @Query('leadStatus') leadStatus?: LeadStatus,
    @Query('search') search?: string
  ) {
    return this.applicationsService.getAdminApplications({
      cycleId,
      status,
      leadStatus,
      search,
    });
  }

  @Patch('admin/applications/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateApplicationStatus(
    @Param('id') id: string,
    @Body('status') status: ApplicationStatus,
    @CurrentUser() user: any
  ) {
    return this.applicationsService.updateApplicationStatus(id, status, user.id);
  }

  @Patch('admin/applications/:id/lead')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateLeadStatus(
    @Param('id') id: string,
    @Body('leadStatus') leadStatus: LeadStatus,
    @CurrentUser() user: any
  ) {
    return this.applicationsService.updateLeadStatus(id, leadStatus, user.id);
  }

  @Post('admin/applications/:id/select')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async selectWinner(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentUser() user: any
  ) {
    return this.applicationsService.selectWinner(id, notes, user.id);
  }

  @Patch('admin/applications/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateApplicationAdmin(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    return this.applicationsService.updateApplicationAdminFields(id, body, user.id);
  }
}
