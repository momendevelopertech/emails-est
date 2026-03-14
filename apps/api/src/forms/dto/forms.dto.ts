import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { FormFieldType } from '@prisma/client';

export class FormFieldDto {
    @IsString()
    label: string;

    @IsString()
    labelAr: string;

    @IsEnum(FormFieldType)
    fieldType: FormFieldType;

    @IsOptional()
    @IsBoolean()
    isRequired?: boolean;

    @IsOptional()
    @IsString()
    placeholder?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    options?: string[];

    @IsOptional()
    @Type(() => Number)
    order?: number;
}

export class CreateFormDto {
    @IsString()
    @MinLength(2)
    name: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    nameAr?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    descriptionAr?: string;

    @IsOptional()
    @IsString()
    departmentId?: string | null;

    @IsOptional()
    @IsBoolean()
    requiresManager?: boolean;

    @IsOptional()
    @IsBoolean()
    requiresHr?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FormFieldDto)
    fields: FormFieldDto[];
}

export class UpdateFormDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    nameAr?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    descriptionAr?: string;

    @IsOptional()
    @IsString()
    departmentId?: string | null;

    @IsOptional()
    @IsBoolean()
    requiresManager?: boolean;

    @IsOptional()
    @IsBoolean()
    requiresHr?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class SubmitFormDto {
    @IsOptional()
    data?: Record<string, any>;
}

export class SubmissionDecisionDto {
    @IsOptional()
    @IsString()
    comment?: string;
}

export class UpdateSubmissionDto {
    @IsOptional()
    data?: Record<string, any>;
}
