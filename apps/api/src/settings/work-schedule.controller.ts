import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkScheduleService } from './work-schedule.service';

@Controller('settings/work-schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkScheduleController {
    constructor(private service: WorkScheduleService) { }

    @Get()
    getSettings() {
        return this.service.getSettings();
    }

    @Put()
    @Roles('SUPER_ADMIN', 'HR_ADMIN')
    updateSettings(@Body() body: any) {
        return this.service.updateSettings(body);
    }
}
