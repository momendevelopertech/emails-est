import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicController } from '../public.controller';

@Module({
    imports: [NotificationsModule],
    controllers: [MessagingController, PublicController],
    providers: [MessagingService],
    exports: [MessagingService],
})
export class MessagingModule { }
