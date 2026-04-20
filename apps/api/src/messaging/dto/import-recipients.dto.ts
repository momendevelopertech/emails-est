import { RecipientSheet } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ImportedRecipientRowDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    arabic_name?: string;

    @IsOptional()
    @IsString()
    email?: string | null;

    @IsOptional()
    @IsString()
    phone?: string | null;

    @IsOptional()
    @IsString()
    division?: string | null;

    @IsOptional()
    @IsString()
    employer?: string | null;

    @IsOptional()
    @IsString()
    kind_of_school?: string | null;

    @IsOptional()
    @IsString()
    title?: string | null;

    @IsOptional()
    @IsString()
    insurance_number?: string | null;

    @IsOptional()
    @IsString()
    institution_tax_number?: string | null;

    @IsOptional()
    @IsString()
    national_id_number?: string | null;

    @IsOptional()
    @IsString()
    national_id_picture?: string | null;

    @IsOptional()
    @IsString()
    personal_photo?: string | null;

    @IsOptional()
    @IsString()
    preferred_proctoring_city?: string | null;

    @IsOptional()
    @IsString()
    preferred_test_center?: string | null;

    @IsOptional()
    @IsString()
    bank_account_name?: string | null;

    @IsOptional()
    @IsString()
    bank_name?: string | null;

    @IsOptional()
    @IsString()
    bank_branch_name?: string | null;

    @IsOptional()
    @IsString()
    account_number?: string | null;

    @IsOptional()
    @IsString()
    iban_number?: string | null;

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
    bank_divid?: string | null;

    @IsOptional()
    @IsString()
    additional_info_1?: string | null;

    @IsOptional()
    @IsString()
    additional_info_2?: string | null;

    @IsOptional()
    @IsString()
    arrival_time?: string | null;

    @IsOptional()
    @IsEnum(RecipientSheet)
    sheet?: RecipientSheet;
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
