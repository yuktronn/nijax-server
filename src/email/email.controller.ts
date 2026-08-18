import { Controller, Get, Post, Param, UseGuards } from "@nestjs/common";
import { EmailService } from "./email.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@prisma/client";

@Controller("admin/emails")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Get()
  async getEmailLogs() {
    return this.emailService.getEmailLogs();
  }

  @Post(":id/retry")
  async retryEmail(@Param("id") id: string) {
    return this.emailService.retryEmail(id);
  }
}
