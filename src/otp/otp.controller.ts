import { Controller, Post, Body } from '@nestjs/common';
import { OtpService } from './otp.service';

@Controller('pilot/otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  async sendOtp(@Body('email') email: string) {
    return this.otpService.sendOtp(email);
  }

  @Post('verify')
  async verifyOtp(@Body('email') email: string, @Body('code') code: string) {
    return this.otpService.verifyOtp(email, code);
  }
}
