import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateRecipientDto } from './create-recipient.dto';

export class ImportedRecipientRowDto extends CreateRecipientDto {}

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
