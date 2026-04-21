import { BadRequestException, Injectable } from '@nestjs/common';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSenderEmailAccountDto } from './dto/create-sender-email-account.dto';
import { TestWhatsAppSettingsDto } from './dto/test-whatsapp-settings.dto';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';
import { UpdateSenderEmailAccountDto } from './dto/update-sender-email-account.dto';
import { UpdateWhatsAppSettingsDto } from './dto/update-whatsapp-settings.dto';
import {
  buildGreenApiTestMessage,
  DEFAULT_GREEN_API_SETTINGS,
  DEFAULT_WHATSAPP_SETTINGS_ID,
  GREEN_API_TEST_CHAT_ID,
  GREEN_API_TEST_PHONE,
} from './whatsapp-settings.constants';

const EMAIL_SETTINGS_ID = 'default';

type SenderAccountSummary = {
  id: string;
  label: string;
  sender_name: string;
  sender_email: string;
  mail_from: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_require_tls: boolean;
  smtp_username: string;
  smtp_daily_limit: number | null;
  has_password: boolean;
  is_active: boolean;
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async getEmailSettings() {
    const [record, accounts, sent_today_success_count] = await Promise.all([
      this.prisma.emailSettings.findUnique({
        where: { id: EMAIL_SETTINGS_ID },
      }),
      this.prisma.senderEmailAccount.findMany({
        orderBy: [
          { updated_at: 'desc' },
          { created_at: 'desc' },
        ],
      }),
      this.getTodaySuccessfulEmailCount(),
    ]);

    const activeAccount = record?.active_sender_account_id
      ? accounts.find((account) => account.id === record.active_sender_account_id) ?? null
      : null;

    const sender_name = activeAccount?.sender_name?.trim() || record?.sender_name?.trim() || this.getFallbackSenderName();
    const sender_email = activeAccount?.sender_email?.trim() || record?.sender_email?.trim() || this.getFallbackSenderEmail();
    const mail_from = activeAccount?.mail_from?.trim() || record?.mail_from?.trim() || this.buildMailFrom(sender_name, sender_email);
    const smtp_host = activeAccount?.smtp_host?.trim() || (process.env.MAIL_HOST || '').trim();
    const smtp_port = activeAccount?.smtp_port ?? this.getMailPort();
    const smtp_daily_limit = activeAccount?.smtp_daily_limit ?? this.getDailyLimit();

    return {
      sender_name,
      sender_email,
      mail_from,
      active_sender_account_id: activeAccount?.id ?? null,
      using_env_fallback: !activeAccount,
      smtp_host,
      smtp_port,
      sent_today_success_count,
      smtp_daily_limit,
      smtp_remaining_today: smtp_daily_limit === null ? null : Math.max(smtp_daily_limit - sent_today_success_count, 0),
      sender_accounts: accounts.map((account) => this.serializeSenderAccount(account, activeAccount?.id ?? null)),
    };
  }

  async updateEmailSettings(dto: UpdateEmailSettingsDto) {
    const existing = await this.prisma.emailSettings.findUnique({
      where: { id: EMAIL_SETTINGS_ID },
    });

    const sender_name = dto.sender_name?.trim() || existing?.sender_name?.trim() || this.getFallbackSenderName();
    const sender_email = dto.sender_email?.trim() || existing?.sender_email?.trim() || this.getFallbackSenderEmail();
    const mail_from = this.buildMailFrom(sender_name, sender_email);

    const active_sender_account_id = dto.active_sender_account_id === undefined
      ? existing?.active_sender_account_id ?? null
      : dto.active_sender_account_id?.trim() || null;

    if (active_sender_account_id) {
      const account = await this.prisma.senderEmailAccount.findUnique({
        where: { id: active_sender_account_id },
        select: { id: true },
      });

      if (!account) {
        throw new BadRequestException('Selected sender account was not found.');
      }
    }

    await this.prisma.emailSettings.upsert({
      where: { id: EMAIL_SETTINGS_ID },
      update: {
        sender_name,
        sender_email,
        mail_from,
        active_sender_account_id,
      },
      create: {
        id: EMAIL_SETTINGS_ID,
        sender_name,
        sender_email,
        mail_from,
        active_sender_account_id,
      },
    });

    this.emailService.clearMailFromCache();
    return this.getEmailSettings();
  }

  async getWhatsAppSettings() {
    const record = await this.prisma.whatsAppSettings.findUnique({
      where: { id: DEFAULT_WHATSAPP_SETTINGS_ID },
    });

    const data = record ?? {
      id: DEFAULT_WHATSAPP_SETTINGS_ID,
      ...DEFAULT_GREEN_API_SETTINGS,
      updated_at: null,
    };

    return {
      api_url: data.api_url,
      media_url: data.media_url,
      id_instance: data.id_instance,
      api_token_instance: data.api_token_instance,
      updated_at: data.updated_at,
      using_default_values: !record,
      test_phone: GREEN_API_TEST_PHONE,
      test_chat_id: GREEN_API_TEST_CHAT_ID,
    };
  }

  async updateWhatsAppSettings(dto: UpdateWhatsAppSettingsDto) {
    const existing = await this.prisma.whatsAppSettings.findUnique({
      where: { id: DEFAULT_WHATSAPP_SETTINGS_ID },
    });

    const api_url = dto.api_url?.trim() ?? existing?.api_url ?? DEFAULT_GREEN_API_SETTINGS.api_url;
    const media_url = dto.media_url?.trim() ?? existing?.media_url ?? DEFAULT_GREEN_API_SETTINGS.media_url;
    const id_instance = dto.id_instance?.trim() ?? existing?.id_instance ?? DEFAULT_GREEN_API_SETTINGS.id_instance;
    const api_token_instance = dto.api_token_instance?.trim() ?? existing?.api_token_instance ?? DEFAULT_GREEN_API_SETTINGS.api_token_instance;

    await this.prisma.whatsAppSettings.upsert({
      where: { id: DEFAULT_WHATSAPP_SETTINGS_ID },
      update: {
        api_url,
        media_url,
        id_instance,
        api_token_instance,
      },
      create: {
        id: DEFAULT_WHATSAPP_SETTINGS_ID,
        api_url,
        media_url,
        id_instance,
        api_token_instance,
      },
    });

    return this.getWhatsAppSettings();
  }

  async testWhatsAppSettings(dto: TestWhatsAppSettingsDto) {
    const message = dto.message?.trim() || buildGreenApiTestMessage();
    const delivery = await this.whatsAppService.sendWhatsApp(GREEN_API_TEST_PHONE, message);

    return {
      ok: delivery.ok,
      phone: GREEN_API_TEST_PHONE,
      chat_id: GREEN_API_TEST_CHAT_ID,
      message,
      delivery,
      settings: await this.getWhatsAppSettings(),
    };
  }

  async createSenderEmailAccount(dto: CreateSenderEmailAccountDto) {
    const sender_name = dto.sender_name.trim();
    const sender_email = dto.sender_email.trim();

    const created = await this.prisma.senderEmailAccount.create({
      data: {
        label: dto.label.trim(),
        sender_name,
        sender_email,
        mail_from: this.buildMailFrom(sender_name, sender_email),
        smtp_host: dto.smtp_host.trim(),
        smtp_port: dto.smtp_port,
        smtp_secure: dto.smtp_secure,
        smtp_require_tls: dto.smtp_require_tls,
        smtp_username: dto.smtp_username.trim(),
        smtp_password: dto.smtp_password,
        smtp_daily_limit: dto.smtp_daily_limit ?? null,
      },
    });

    const existing = await this.prisma.emailSettings.findUnique({
      where: { id: EMAIL_SETTINGS_ID },
    });

    if (!existing?.active_sender_account_id) {
      await this.prisma.emailSettings.upsert({
        where: { id: EMAIL_SETTINGS_ID },
        update: {
          active_sender_account_id: created.id,
          sender_name,
          sender_email,
          mail_from: this.buildMailFrom(sender_name, sender_email),
        },
        create: {
          id: EMAIL_SETTINGS_ID,
          active_sender_account_id: created.id,
          sender_name,
          sender_email,
          mail_from: this.buildMailFrom(sender_name, sender_email),
        },
      });
    }

    this.emailService.clearMailFromCache();
    return this.getEmailSettings();
  }

  async updateSenderEmailAccount(id: string, dto: UpdateSenderEmailAccountDto) {
    const existing = await this.prisma.senderEmailAccount.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new BadRequestException('Sender account not found.');
    }

    const sender_name = dto.sender_name?.trim() || existing.sender_name;
    const sender_email = dto.sender_email?.trim() || existing.sender_email;

    await this.prisma.senderEmailAccount.update({
      where: { id },
      data: {
        label: dto.label?.trim() || existing.label,
        sender_name,
        sender_email,
        mail_from: this.buildMailFrom(sender_name, sender_email),
        smtp_host: dto.smtp_host?.trim() || existing.smtp_host,
        smtp_port: dto.smtp_port ?? existing.smtp_port,
        smtp_secure: dto.smtp_secure ?? existing.smtp_secure,
        smtp_require_tls: dto.smtp_require_tls ?? existing.smtp_require_tls,
        smtp_username: dto.smtp_username?.trim() || existing.smtp_username,
        smtp_password: dto.smtp_password?.trim() || existing.smtp_password,
        smtp_daily_limit: dto.smtp_daily_limit ?? existing.smtp_daily_limit ?? null,
      },
    });

    const settings = await this.prisma.emailSettings.findUnique({
      where: { id: EMAIL_SETTINGS_ID },
      select: { active_sender_account_id: true },
    });

    if (settings?.active_sender_account_id === id) {
      await this.prisma.emailSettings.upsert({
        where: { id: EMAIL_SETTINGS_ID },
        update: {
          sender_name,
          sender_email,
          mail_from: this.buildMailFrom(sender_name, sender_email),
        },
        create: {
          id: EMAIL_SETTINGS_ID,
          sender_name,
          sender_email,
          mail_from: this.buildMailFrom(sender_name, sender_email),
          active_sender_account_id: id,
        },
      });
    }

    this.emailService.clearMailFromCache();
    return this.getEmailSettings();
  }

  async deleteSenderEmailAccount(id: string) {
    const existing = await this.prisma.senderEmailAccount.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new BadRequestException('Sender account not found.');
    }

    await this.prisma.$transaction(async (tx) => {
      const settings = await tx.emailSettings.findUnique({
        where: { id: EMAIL_SETTINGS_ID },
        select: { active_sender_account_id: true },
      });

      await tx.senderEmailAccount.delete({
        where: { id },
      });

      if (settings?.active_sender_account_id === id) {
        const replacement = await tx.senderEmailAccount.findFirst({
          orderBy: [
            { updated_at: 'desc' },
            { created_at: 'desc' },
          ],
        });

        await tx.emailSettings.upsert({
          where: { id: EMAIL_SETTINGS_ID },
          update: {
            active_sender_account_id: replacement?.id ?? null,
            sender_name: replacement?.sender_name ?? this.getFallbackSenderName(),
            sender_email: replacement?.sender_email ?? this.getFallbackSenderEmail(),
            mail_from: replacement
              ? replacement.mail_from
              : this.buildMailFrom(this.getFallbackSenderName(), this.getFallbackSenderEmail()),
          },
          create: {
            id: EMAIL_SETTINGS_ID,
            active_sender_account_id: replacement?.id ?? null,
            sender_name: replacement?.sender_name ?? this.getFallbackSenderName(),
            sender_email: replacement?.sender_email ?? this.getFallbackSenderEmail(),
            mail_from: replacement
              ? replacement.mail_from
              : this.buildMailFrom(this.getFallbackSenderName(), this.getFallbackSenderEmail()),
          },
        });
      }
    });

    this.emailService.clearMailFromCache();
    return this.getEmailSettings();
  }

  private serializeSenderAccount(
    account: {
      id: string;
      label: string;
      sender_name: string;
      sender_email: string;
      mail_from: string;
      smtp_host: string;
      smtp_port: number;
      smtp_secure: boolean;
      smtp_require_tls: boolean;
      smtp_username: string;
      smtp_password: string;
      smtp_daily_limit: number | null;
    },
    activeSenderAccountId: string | null,
  ): SenderAccountSummary {
    return {
      id: account.id,
      label: account.label,
      sender_name: account.sender_name,
      sender_email: account.sender_email,
      mail_from: account.mail_from,
      smtp_host: account.smtp_host,
      smtp_port: account.smtp_port,
      smtp_secure: account.smtp_secure,
      smtp_require_tls: account.smtp_require_tls,
      smtp_username: account.smtp_username,
      smtp_daily_limit: account.smtp_daily_limit,
      has_password: Boolean(account.smtp_password),
      is_active: account.id === activeSenderAccountId,
    };
  }

  private async getTodaySuccessfulEmailCount() {
    const todayUtcStart = new Date();
    todayUtcStart.setUTCHours(0, 0, 0, 0);

    return this.prisma.log.count({
      where: {
        status: 'SENT',
        created_at: {
          gte: todayUtcStart,
        },
        recipient: {
          email: {
            not: null,
          },
        },
      },
    });
  }

  private getDailyLimit() {
    const parsed = parseInt(process.env.MAIL_DAILY_LIMIT || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
    return (process.env.SENDER_NAME || 'EST').trim() || 'EST';
  }

  private getFallbackSenderEmail() {
    return (process.env.SENDER_EMAIL || process.env.MAIL_USER || '').trim();
  }

  private getMailPort() {
    const parsed = parseInt(process.env.MAIL_PORT || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
  }
}
