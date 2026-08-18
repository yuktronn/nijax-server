import { Module } from '@nestjs/common';
import { PilotService } from './pilot.service';
import { PilotController } from './pilot.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [PilotService],
  controllers: [PilotController],
  exports: [PilotService],
})
export class PilotModule {}
