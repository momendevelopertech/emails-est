import { RecipientSheet } from '@prisma/client';
import { Type } from 'class-transformer';
import { Allow, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ImportedRecipientRowDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    email?: string | null;

    @IsOptional()
    @IsString()
    phone?: string | null;

    @IsOptional()
    @IsString()
    exam_type?: string | null;

    @IsOptional()
    @IsString()
    role?: string | null;

    @IsOptional()
    @IsString()
    day?: string | null;

    @IsOptional()
    @IsString()
    date?: string | null;

    @IsOptional()
    @IsString()
    test_center?: string | null;

    @IsOptional()
    @IsString()
    faculty?: string | null;

    @IsOptional()
    @IsString()
    room?: string | null;

    @IsOptional()
    @IsString()
    room_est1?: string | null;

    @IsOptional()
    @IsString()
    type?: string | null;

    @IsOptional()
    @IsString()
    governorate?: string | null;

    @IsOptional()
    @IsString()
    address?: string | null;

    @IsOptional()
    @IsString()
    building?: string | null;

    @IsOptional()
    @IsString()
    location?: string | null;

    @IsOptional()
    @IsString()
    map_link?: string | null;

    @IsOptional()
    @IsString()
    arrival_time?: string | null;

    @IsOptional()
    @IsEnum(RecipientSheet)
    sheet?: RecipientSheet;

    // Allow additional properties from Excel headers
    @Allow()
    [key: string]: unknown;
}

export class ImportRecipientsDto {
    @IsOptional()
    @IsString()
    cycle_name?: string;

    @IsOptional()
    @IsString()
    source_file_name?: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ImportedRecipientRowDto)
    recipients: ImportedRecipientRowDto[];
}
