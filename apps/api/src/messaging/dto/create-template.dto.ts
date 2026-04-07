import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum TemplateType {
    EMAIL = 'EMAIL',
    WHATSAPP = 'WHATSAPP',
    BOTH = 'BOTH',
}

export class CreateTemplateDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsEnum(TemplateType)
    type: TemplateType;

    @IsNotEmpty()
    @IsString()
    subject: string;

    @IsNotEmpty()
    @IsString()
    body: string;
}
