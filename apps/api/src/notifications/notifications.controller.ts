import { Controller, Get, Patch, Param, UseGuards, Req, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private notificationsService: NotificationsService) { }

    @Get()
    getAll(
        @Req() req: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('type') type?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.notificationsService.getAll(req.user.id, {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            type,
            status,
            search,
            from,
            to,
        });
    }

    @Get('unread')
    getUnread(@Req() req: any) {
        return this.notificationsService.getUnread(req.user.id);
    }

    @Patch(':id/read')
    markRead(@Param('id') id: string, @Req() req: any) {
        return this.notificationsService.markRead(id, req.user.id);
    }

    @Patch('read-all')
    markAllRead(@Req() req: any) {
        return this.notificationsService.markAllRead(req.user.id);
    }
}
