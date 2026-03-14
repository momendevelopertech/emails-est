import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DateRangeQueryDto } from '../../shared/dto/date-range.dto';

export class NotificationsQueryDto extends DateRangeQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    search?: string;
}

export class CreateAnnouncementDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    titleAr?: string;

    @IsString()
    body: string;

    @IsOptional()
    @IsString()
    bodyAr?: string;

    @IsOptional()
    @IsIn(['ALL', 'DEPARTMENT', 'GOVERNORATE', 'USERS'])
    targetScope?: 'ALL' | 'DEPARTMENT' | 'GOVERNORATE' | 'USERS';

    @IsOptional()
    @IsString()
    departmentId?: string;

    @IsOptional()
    @IsString()
    governorate?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    userIds?: string[];
}
