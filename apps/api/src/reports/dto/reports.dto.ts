import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Governorate, LeaveType, PermissionType, RequestStatus } from '@prisma/client';

export class ReportsQueryDto {
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
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;

    @IsOptional()
    @IsEnum(RequestStatus)
    status?: RequestStatus;

    @IsOptional()
    @IsEnum(LeaveType)
    leaveType?: LeaveType;

    @IsOptional()
    @IsEnum(PermissionType)
    permissionType?: PermissionType;

    @IsOptional()
    @IsString()
    reportType?: string;

    @IsOptional()
    @IsString()
    departmentId?: string;

    @IsOptional()
    @IsEnum(Governorate)
    governorate?: Governorate;

    @IsOptional()
    @IsString()
    employee?: string;

    @IsOptional()
    @IsString()
    userId?: string;
}
