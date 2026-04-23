import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingService } from './messaging.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { ImportRecipientsDto } from './dto/import-recipients.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { RetryRecipientsDto } from './dto/retry-recipients.dto';
import { RecipientFilterDto } from './dto/recipient-filter.dto';
import { SendHierarchyBriefsDto } from './dto/send-hierarchy-briefs.dto';
import { UpdateRecipientResponseDto } from './dto/update-recipient-response.dto';
import { RecipientSheet } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
    constructor(private readonly messagingService: MessagingService) {}

    @Get('recipients')
    async getRecipients(@Query() filter: RecipientFilterDto) {
        return this.messagingService.findRecipients(filter);
    }

    @Get('cycles')
    async getCycles() {
        return this.messagingService.getCycles();
    }

    @Delete('cycles/:id')
    async deleteCycle(@Param('id') id: string) {
        return this.messagingService.deleteCycle(id);
    }

    @Get('filters/options')
    async getRecipientFilterOptions(@Query('cycleId') cycleId?: string) {
        return this.messagingService.getRecipientFilterOptions(cycleId);
    }

    @Post('recipients/import')
    async importRecipients(@Body() body: ImportRecipientsDto) {
        return this.messagingService.importRecipients(body);
    }

    @Post('recipients')
    async createRecipient(@Body() body: CreateRecipientDto) {
        return this.messagingService.createRecipient(body);
    }

    @Put('recipients/:id')
    async updateRecipient(@Param('id') id: string, @Body() body: CreateRecipientDto) {
        return this.messagingService.updateRecipient(id, body);
    }

    @Patch('recipients/:id/sheet')
    async swapRecipientSheet(@Param('id') id: string, @Body() body: { sheet: RecipientSheet }) {
        return this.messagingService.swapRecipientSheet(id, body.sheet);
    }

    @Put('recipients/:id/response')
    async updateRecipientResponse(@Req() req: Request, @Param('id') id: string, @Body() body: UpdateRecipientResponseDto) {
        this.ensureMessagingManager(req);
        return this.messagingService.updateRecipientResponse(id, body.status);
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

    @Post('hierarchy-briefs/preview')
    async previewHierarchyBriefs(@Body() body: SendHierarchyBriefsDto) {
        return this.messagingService.previewHierarchyBriefs(body);
    }

    @Post('hierarchy-briefs/send')
    async sendHierarchyBriefsConfirmed(@Body() body: SendHierarchyBriefsDto) {
        return this.messagingService.sendHierarchyBriefs(body);
    }

    @Post('send-hierarchy-briefs')
    async sendHierarchyBriefs(@Body() body: SendHierarchyBriefsDto) {
        return this.messagingService.sendHierarchyBriefs(body);
    }

    @Get('logs')
    async getLogs(@Query('page') page = '1', @Query('limit') limit = '100', @Query('cycleId') cycleId?: string) {
        return this.messagingService.getLogs(parseInt(page, 10), parseInt(limit, 10), cycleId);
    }

    private ensureMessagingManager(req: Request) {
        const role = (req as Request & { user?: { role?: string } }).user?.role;
        if (role !== 'SUPER_ADMIN' && role !== 'HR_ADMIN') {
            throw new ForbiddenException('Only super admins and HR admins can update recipient responses.');
        }
    }
}
