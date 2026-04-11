import { Body, Controller, ForbiddenException, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('email')
  async getEmailSettings() {
    return this.settingsService.getEmailSettings();
  }

  @Patch('email')
  async updateEmailSettings(@Req() req: Request, @Body() body: UpdateEmailSettingsDto) {
    this.ensureSuperAdmin(req);
    return this.settingsService.updateEmailSettings(body);
  }

  private ensureSuperAdmin(req: Request) {
    const role = (req as Request & { user?: { role?: string } }).user?.role;
    if (role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can manage email settings.');
    }
  }
}
