import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { EmailService } from './email.service';

@Module({
  providers: [WhatsAppService, EmailService],
  exports: [WhatsAppService, EmailService],
})
export class NotificationsModule {}
