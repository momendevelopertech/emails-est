import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateRecipientDto } from './create-recipient.dto';

export class ImportRecipientsDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateRecipientDto)
    recipients: CreateRecipientDto[];
}
