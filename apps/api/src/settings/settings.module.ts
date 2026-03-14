import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkScheduleController } from './work-schedule.controller';
import { WorkScheduleService } from './work-schedule.service';
import { DataResetController } from './data-reset.controller';
import { DataResetService } from './data-reset.service';

@Module({
    imports: [PrismaModule],
    controllers: [WorkScheduleController, DataResetController],
    providers: [WorkScheduleService, DataResetService],
})
export class SettingsModule { }
