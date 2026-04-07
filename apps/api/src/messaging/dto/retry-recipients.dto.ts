import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RetryRecipientsDto {
    @IsNotEmpty()
    @IsString()
    templateId: string;

    @IsOptional()
    @ArrayNotEmpty()
    @IsArray()
    @IsString({ each: true })
    ids?: string[];
}
