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
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    division?: string;

    @Transform(({ value }) => normalizeOptionalString(value) ?? '')
    @IsString()
    name: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    arabic_name?: string;

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
    employer?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    kind_of_school?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    title?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    insurance_number?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    institution_tax_number?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    national_id_number?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    national_id_picture?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    personal_photo?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    preferred_proctoring_city?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    preferred_test_center?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    bank_account_name?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    bank_name?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    bank_branch_name?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    account_number?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    iban_number?: string;

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
    bank_divid?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    additional_info_1?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    additional_info_2?: string;

    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    arrival_time?: string;
}
