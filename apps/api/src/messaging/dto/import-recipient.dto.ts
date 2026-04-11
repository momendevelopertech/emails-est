import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString } from 'class-validator';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const normalizeOptionalString = (value: unknown) => {
    if (value === null || value === undefined) {
        return undefined;
    }

    const normalized = String(value).trim();
    return normalized.length ? normalized : undefined;
};

const normalizeImportEmail = (value: unknown) => {
    const normalized = normalizeOptionalString(value);
    if (!normalized) {
        return undefined;
    }

    return EMAIL_PATTERN.test(normalized) ? normalized : undefined;
};

export class ImportRecipientDto {
    @Transform(({ value }) => normalizeOptionalString(value) ?? '')
    @IsString()
    name: string;

    @Transform(({ value }) => normalizeImportEmail(value))
    @IsOptional()
    @IsEmail()
    email?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    phone?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    exam_type?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    role?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    day?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    date?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    test_center?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    faculty?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    room?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    room_est1?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    type?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    governorate?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    address?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    building?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    location?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    map_link?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    arrival_time?: string;
}
