import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum RecipientStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    SENT = 'SENT',
    FAILED = 'FAILED',
}

export class RecipientFilterDto {
    @IsOptional()
    @IsString()
    exam_type?: string;

    @IsOptional()
    @IsString()
    role?: string;

    @IsOptional()
    @IsString()
    day?: string;

    @IsOptional()
    @IsEnum(RecipientStatus)
    status?: RecipientStatus;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number;
}
