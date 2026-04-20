import { IsNotEmpty, IsString } from 'class-validator';

export class WhatsAppReplyDto {
    @IsString()
    @IsNotEmpty()
    phone!: string;

    @IsString()
    @IsNotEmpty()
    message!: string;
}
