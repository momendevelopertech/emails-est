import { RecipientSheet } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

const toBoolean = (value: unknown) => {
    if (typeof value === 'boolean') {
        return value;
    }

    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) {
        return false;
    }

    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return false;
};

export class SendHierarchyBriefsDto {
    @IsOptional()
    @IsString()
    cycleId?: string;

    @IsOptional()
    @IsEnum(RecipientSheet)
    sheet?: RecipientSheet;

    @Transform(({ value }) => toBoolean(value))
    @IsOptional()
    @IsBoolean()
    dry_run?: boolean;
}
