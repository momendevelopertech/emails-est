import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PdfModule } from '../pdf/pdf.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [PdfModule, RedisModule],
    providers: [ReportsService],
    controllers: [ReportsController],
    exports: [ReportsService],
})
export class ReportsModule { }
