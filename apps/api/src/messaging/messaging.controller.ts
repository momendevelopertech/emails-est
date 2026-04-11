import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingService } from './messaging.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { ImportRecipientsDto } from './dto/import-recipients.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { RetryRecipientsDto } from './dto/retry-recipients.dto';
import { RecipientFilterDto } from './dto/recipient-filter.dto';

@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
    constructor(private readonly messagingService: MessagingService) {}

    @Get('recipients')
    async getRecipients(@Query() filter: RecipientFilterDto) {
        return this.messagingService.findRecipients(filter);
    }

    @Post('recipients/import')
    async importRecipients(@Body() body: ImportRecipientsDto) {
        return this.messagingService.importRecipients(body.recipients);
    }

    @Post('recipients')
    async createRecipient(@Body() body: CreateRecipientDto) {
        return this.messagingService.createRecipient(body);
    }

    @Put('recipients/:id')
    async updateRecipient(@Param('id') id: string, @Body() body: CreateRecipientDto) {
        return this.messagingService.updateRecipient(id, body);
    }

    @Delete('recipients/:id')
    async deleteRecipient(@Param('id') id: string) {
        return this.messagingService.deleteRecipient(id);
    }

    @Get('templates')
    async getTemplates() {
        return this.messagingService.getTemplates();
    }

    @Post('templates')
    async createTemplate(@Body() body: CreateTemplateDto) {
        return this.messagingService.createTemplate(body);
    }

    @Put('templates/:id')
    async updateTemplate(@Param('id') id: string, @Body() body: UpdateTemplateDto) {
        return this.messagingService.updateTemplate(id, body);
    }

    @Delete('templates/:id')
    async deleteTemplate(@Param('id') id: string) {
        return this.messagingService.deleteTemplate(id);
    }

    @Post('send')
    async sendCampaign(@Body() body: SendCampaignDto) {
        return this.messagingService.sendCampaign(body);
    }

    @Post('retry')
    async retryRecipients(@Body() body: RetryRecipientsDto) {
        return this.messagingService.retryRecipients(body);
    }

    @Get('logs')
    async getLogs(@Query('page') page = '1', @Query('limit') limit = '100') {
        return this.messagingService.getLogs(parseInt(page, 10), parseInt(limit, 10));
    }
}
