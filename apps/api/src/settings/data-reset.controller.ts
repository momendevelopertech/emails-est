import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DataResetService } from './data-reset.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DataResetController {
    constructor(private service: DataResetService) { }

    @Post('reset-data')
    @Roles('SUPER_ADMIN', 'HR_ADMIN')
    resetData() {
        return this.service.resetAllEmployeeData();
    }
}
