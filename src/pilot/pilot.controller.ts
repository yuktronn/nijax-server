import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { PilotService } from './pilot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { Role } from '@prisma/client';

@Controller()
export class PilotController {
  constructor(private pilotService: PilotService) {}

  // Public Endpoints
  @Get('pilot/cycles/current')
  async getCurrentCycle() {
    return this.pilotService.getCurrentCycle();
  }

  @Get('pilot/cycles/:id/status')
  async getCycleStatus(@Param('id') id: string) {
    const cycle = await this.pilotService.getCycleById(id);
    return {
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
      selectionAt: cycle.selectionAt,
    };
  }

  @Get('pilot/settings')
  async getCampaignSettings() {
    return this.pilotService.getCampaignSettings();
  }

  // Admin Endpoints
  @Get('admin/campaign-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getCampaignSettingsAdmin() {
    return this.pilotService.getCampaignSettings();
  }

  @Post('admin/campaign-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateCampaignSettings(@Body() body: any, @CurrentUser() user: any) {
    return this.pilotService.updateCampaignSettings(body, user.id);
  }

  @Get('pilot/cycles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllCycles() {
    return this.pilotService.getAllCycles();
  }

  @Post('pilot/cycles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createCycle(@Body() body: any, @CurrentUser() user: any) {
    return this.pilotService.createCycle(body, user.id);
  }

  @Patch('pilot/cycles/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateCycle(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    return this.pilotService.updateCycle(id, body, user.id);
  }
}
