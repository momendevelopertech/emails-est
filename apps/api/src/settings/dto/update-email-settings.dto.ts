import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UpdateEmailSettingsDto {
  @IsNotEmpty()
  @IsString()
  sender_name: string;

  @IsNotEmpty()
  @IsEmail()
  sender_email: string;
}
