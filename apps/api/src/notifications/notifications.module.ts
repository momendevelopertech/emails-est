import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppService } from './whatsapp.service';
import { EmailService } from './email.service';

@Module({
  imports: [PrismaModule],
  providers: [WhatsAppService, EmailService],
  exports: [WhatsAppService, EmailService],
})
export class NotificationsModule {}
