import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { PilotModule } from './pilot/pilot.module';
import { ApplicationsModule } from './applications/applications.module';
import { ProjectsModule } from './projects/projects.module';
import { ConversationModule } from './conversation/conversation.module';
import { ServicesModule } from './services/services.module';
import { OtpModule } from './otp/otp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EmailModule,
    AuditModule,
    AuthModule,
    PilotModule,
    ApplicationsModule,
    ProjectsModule,
    ConversationModule,
    ServicesModule,
    OtpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
