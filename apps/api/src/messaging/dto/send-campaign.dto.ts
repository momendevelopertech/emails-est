import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RecipientFilterDto } from './recipient-filter.dto';

export enum SendMode {
    SELECTED = 'selected',
    ALL_PENDING = 'all_pending',
    FILTERED = 'filtered',
    FAILED = 'failed',
}

export class SendCampaignDto {
    @IsNotEmpty()
    @IsString()
    templateId: string;

    @IsOptional()
    @IsString()
    cycleId?: string;

    @IsEnum(SendMode)
    mode: SendMode;

    @IsOptional()
    @ValidateNested()
    @Type(() => RecipientFilterDto)
    filter?: RecipientFilterDto;

    @IsOptional()
    @ArrayNotEmpty()
    @IsArray()
    @IsString({ each: true })
    ids?: string[];
}
