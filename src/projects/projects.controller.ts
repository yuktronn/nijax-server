import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { Role, ProjectStatus } from '@prisma/client';

@Controller()
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  // ----------------------------------------------------
  // PUBLIC ENDPOINTS
  // ----------------------------------------------------
  
  @Get('success-stories')
  async getSuccessStories() {
    return this.projectsService.getSuccessStories();
  }

  // ----------------------------------------------------
  // CLIENT APPLICANT ENDPOINTS
  // ----------------------------------------------------

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  async submitFeedback(@Body() body: any, @CurrentUser() user: any) {
    return this.projectsService.submitFeedback(user.id, body);
  }

  // ----------------------------------------------------
  // ADMIN CONTROL ENDPOINTS
  // ----------------------------------------------------

  @Get('projects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllProjects() {
    return this.projectsService.getAllProjects();
  }

  @Get('projects/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getProjectById(@Param('id') id: string) {
    return this.projectsService.getProjectById(id);
  }

  @Patch('projects/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateProject(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    return this.projectsService.updateProject(id, body, user.id);
  }

  @Get('admin/feedbacks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAdminFeedbacks() {
    return this.projectsService.getAdminFeedbacks();
  }

  @Patch('admin/feedbacks/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateFeedbackAdmin(
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.projectsService.updateFeedbackAdmin(id, body);
  }
}
