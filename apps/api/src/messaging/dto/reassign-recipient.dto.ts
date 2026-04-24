import { RecipientSheet } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class ReassignRecipientDto {
    @IsEnum(RecipientSheet)
    targetSheet!: RecipientSheet;

    @IsString()
    templateRecipientId!: string;
}
