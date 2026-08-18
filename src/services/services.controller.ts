import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { Role } from '@prisma/client';

@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Public endpoint for Digital Pilot page
  @Get('pilot/services')
  async getActiveServices() {
    return this.servicesService.getActiveServices();
  }

  // Admin protected endpoints
  @Get('admin/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllAdminServices() {
    return this.servicesService.getAllAdminServices();
  }

  @Post('admin/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createService(@Body() body: any, @CurrentUser() user: any) {
    return this.servicesService.createService(body, user.id);
  }

  @Patch('admin/services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateService(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    return this.servicesService.updateService(id, body, user.id);
  }

  @Delete('admin/services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteService(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.softDeleteService(id, user.id);
  }
}
