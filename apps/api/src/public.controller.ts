import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MessagingService } from './messaging/messaging.service';
import { ConfirmRecipientDto } from './messaging/dto/confirm-recipient.dto';

@Controller('public')
export class PublicController {
    constructor(private readonly messagingService: MessagingService) {}

    @Post('recipients/confirm')
    @HttpCode(HttpStatus.OK)
    async confirmRecipient(@Body() body: ConfirmRecipientDto) {
        return this.messagingService.confirmRecipient(body.token);
    }
}
