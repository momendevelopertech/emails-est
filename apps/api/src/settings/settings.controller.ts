import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSenderEmailAccountDto } from './dto/create-sender-email-account.dto';
import { TestWhatsAppSettingsDto } from './dto/test-whatsapp-settings.dto';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';
import { UpdateSenderEmailAccountDto } from './dto/update-sender-email-account.dto';
import { UpdateWhatsAppSettingsDto } from './dto/update-whatsapp-settings.dto';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('email')
  async getEmailSettings() {
    return this.settingsService.getEmailSettings();
  }

  @Get('whatsapp')
  async getWhatsAppSettings() {
    return this.settingsService.getWhatsAppSettings();
  }

  @Patch('email')
  async updateEmailSettings(@Req() req: Request, @Body() body: UpdateEmailSettingsDto) {
    this.ensureSuperAdmin(req);
    return this.settingsService.updateEmailSettings(body);
  }

  @Patch('whatsapp')
  async updateWhatsAppSettings(@Req() req: Request, @Body() body: UpdateWhatsAppSettingsDto) {
    this.ensureSuperAdmin(req);
    return this.settingsService.updateWhatsAppSettings(body);
  }

  @Post('whatsapp/test')
  async testWhatsAppSettings(@Req() req: Request, @Body() body: TestWhatsAppSettingsDto) {
    this.ensureSuperAdmin(req);
    return this.settingsService.testWhatsAppSettings(body);
  }

  @Post('email/accounts')
  async createSenderEmailAccount(@Req() req: Request, @Body() body: CreateSenderEmailAccountDto) {
    this.ensureSuperAdmin(req);
    return this.settingsService.createSenderEmailAccount(body);
  }

  @Patch('email/accounts/:id')
  async updateSenderEmailAccount(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateSenderEmailAccountDto,
  ) {
    this.ensureSuperAdmin(req);
    return this.settingsService.updateSenderEmailAccount(id, body);
  }

  @Delete('email/accounts/:id')
  async deleteSenderEmailAccount(@Req() req: Request, @Param('id') id: string) {
    this.ensureSuperAdmin(req);
    return this.settingsService.deleteSenderEmailAccount(id);
  }

  private ensureSuperAdmin(req: Request) {
    const role = (req as Request & { user?: { role?: string } }).user?.role;
    if (role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can manage system settings.');
    }
  }
}
