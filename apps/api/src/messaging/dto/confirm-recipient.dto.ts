import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmRecipientDto {
    @IsString()
    @IsNotEmpty()
    token!: string;
}
