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

const normalizeOptionalEmail = (value: unknown) => {
    const normalized = normalizeOptionalString(value);
    if (!normalized) {
        return undefined;
    }

    return EMAIL_PATTERN.test(normalized) ? normalized : undefined;
};

export class CreateRecipientDto {
    @Transform(({ value }) => normalizeOptionalString(value) ?? '')
    @IsString()
    name: string;

    @Transform(({ value }) => normalizeOptionalEmail(value))
    @IsOptional()
    @IsEmail()
    email?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    phone?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    exam_type?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    role?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    day?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    date?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    test_center?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    faculty?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    room?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    room_est1?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    type?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    governorate?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    address?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    building?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    location?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    map_link?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    arrival_time?: string | null;
}
