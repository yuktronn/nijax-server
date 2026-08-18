import { Controller, Post, Body, Req, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    // Validate credentials
    const user = await this.authService.validateUser(body.email, body.password);
    // Return access token
    return this.authService.login(user, ipAddress);
  }

  @Post('magic-login')
  @HttpCode(HttpStatus.OK)
  async magicLogin(@Body() body: { token: string }, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.authService.verifyMagicToken(body.token, ipAddress);
  }
}
