import { Injectable } from '@nestjs/common';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';

const EMAIL_SETTINGS_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getEmailSettings() {
    const record = await this.prisma.emailSettings.findUnique({
      where: { id: EMAIL_SETTINGS_ID },
    });

    const sender_name = record?.sender_name?.trim() || this.getFallbackSenderName();
    const sender_email = record?.sender_email?.trim() || this.getFallbackSenderEmail();
    const mail_from = this.buildMailFrom(sender_name, sender_email);

    return {
      sender_name,
      sender_email,
      mail_from,
      smtp_host: (process.env.MAIL_HOST || '').trim(),
      smtp_port: this.getMailPort(),
    };
  }

  async updateEmailSettings(dto: UpdateEmailSettingsDto) {
    const sender_name = dto.sender_name.trim();
    const sender_email = dto.sender_email.trim();
    const mail_from = this.buildMailFrom(sender_name, sender_email);

    const record = await this.prisma.emailSettings.upsert({
      where: { id: EMAIL_SETTINGS_ID },
      update: {
        sender_name,
        sender_email,
        mail_from,
      },
      create: {
        id: EMAIL_SETTINGS_ID,
        sender_name,
        sender_email,
        mail_from,
      },
    });

    this.emailService.clearMailFromCache();

    return {
      sender_name: record.sender_name,
      sender_email: record.sender_email,
      mail_from: record.mail_from,
      smtp_host: (process.env.MAIL_HOST || '').trim(),
      smtp_port: this.getMailPort(),
    };
  }

  private buildMailFrom(senderName: string, senderEmail: string) {
    if (senderName && senderEmail) {
      return `${senderName} <${senderEmail}>`;
    }
    if (senderEmail) {
      return senderEmail;
    }
    return senderName || this.getFallbackSenderName();
  }

  private getFallbackSenderName() {
    return (process.env.SENDER_NAME || 'SPHINX HR').trim() || 'SPHINX HR';
  }

  private getFallbackSenderEmail() {
    return (process.env.SENDER_EMAIL || process.env.MAIL_USER || '').trim();
  }

  private getMailPort() {
    const parsed = parseInt(process.env.MAIL_PORT || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
  }
}
