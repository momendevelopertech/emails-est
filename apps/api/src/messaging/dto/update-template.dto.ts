import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TemplateType } from './create-template.dto';

export class UpdateTemplateDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEnum(TemplateType)
    type?: TemplateType;

    @IsOptional()
    @IsString()
    subject?: string;

    @IsOptional()
    @IsString()
    body?: string;
}
