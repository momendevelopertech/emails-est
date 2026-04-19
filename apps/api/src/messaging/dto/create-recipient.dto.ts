import { RecipientSheet } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

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
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    cycleId?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    division?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value) ?? '')
    @IsString()
    name: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    arabic_name?: string | null;

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
    employer?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    kind_of_school?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    title?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    insurance_number?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    institution_tax_number?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    national_id_number?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    national_id_picture?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    personal_photo?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    preferred_proctoring_city?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    preferred_test_center?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    bank_account_name?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    bank_name?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    bank_branch_name?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    account_number?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    iban_number?: string | null;

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
    bank_divid?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    additional_info_1?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    additional_info_2?: string | null;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    arrival_time?: string | null;

    @IsOptional()
    @IsEnum(RecipientSheet)
    sheet?: RecipientSheet;
}
