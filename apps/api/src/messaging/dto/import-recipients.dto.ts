import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ImportRecipientDto } from './import-recipient.dto';

export class ImportRecipientsDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ImportRecipientDto)
    recipients: ImportRecipientDto[];
}
