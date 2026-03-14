import { Controller, Get, Patch, Param, UseGuards, Req, Query, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { CreateAnnouncementDto, NotificationsQueryDto } from './dto/notifications.dto';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private notificationsService: NotificationsService) { }

    @Get()
    getAll(@Req() req: any, @Query() query: NotificationsQueryDto) {
        return this.notificationsService.getAll(req.user.id, {
            page: query.page ?? 1,
            limit: query.limit ?? 20,
            type: query.type,
            status: query.status,
            search: query.search,
            from: query.from,
            to: query.to,
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


    @Patch('read-type/:type')
    markAllReadByType(@Param('type') type: string, @Req() req: any) {
        return this.notificationsService.markAllReadByType(req.user.id, type);
    }

    @Post('announcement')
    @UseGuards(RolesGuard)
    @Roles('SUPER_ADMIN', 'HR_ADMIN', 'BRANCH_SECRETARY')
    createAnnouncement(
        @Req() req: any,
        @Body() body: CreateAnnouncementDto,
    ) {
        const targetScope = body.targetScope || 'ALL';
        const governorate = req.user.role === 'BRANCH_SECRETARY' ? req.user.governorate : body.governorate;

        return this.notificationsService.broadcastToUsers({
            senderId: req.user.id,
            type: 'ANNOUNCEMENT',
            title: body.title,
            titleAr: body.titleAr || body.title,
            body: body.body,
            bodyAr: body.bodyAr || body.body,
            metadata: {
                kind: 'ANNOUNCEMENT',
                targetScope,
            },
            ...(targetScope === 'DEPARTMENT' ? { departmentId: body.departmentId, ...(req.user.role === 'BRANCH_SECRETARY' ? { governorate } : {}) } : {}),
            ...(targetScope === 'GOVERNORATE' ? { governorate } : {}),
            ...(targetScope === 'USERS' ? { userIds: body.userIds || [], ...(req.user.role === 'BRANCH_SECRETARY' ? { governorate } : {}) } : {}),
            ...(req.user.role === 'BRANCH_SECRETARY' && targetScope === 'ALL' ? { governorate } : {}),
        });
    }

    @Post('payroll')
    @UseGuards(RolesGuard)
    @Roles('SUPER_ADMIN', 'HR_ADMIN')
    triggerPayroll(@Req() req: any) {
        return this.notificationsService.broadcastToUsers({
            senderId: req.user.id,
            type: 'ANNOUNCEMENT',
            title: 'Payroll Released',
            titleAr: 'تم صرف الرواتب',
            body: 'Your salary has been released. Thank you for your work!',
            bodyAr: 'تم صرف الرواتب. شكرًا لجهودكم!',
            metadata: { kind: 'PAYROLL' },
        });
    }
}

