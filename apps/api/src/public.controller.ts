import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
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

    @Post('recipients/decline')
    @HttpCode(HttpStatus.OK)
    async declineRecipient(@Body() body: ConfirmRecipientDto) {
        return this.messagingService.declineRecipient(body.token);
    }

    @Get('recipients/response')
    async getRecipientResponse(@Query('token') token?: string) {
        return this.messagingService.getRecipientResponse(token || '');
    }
}
