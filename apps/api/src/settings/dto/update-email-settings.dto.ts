import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateEmailSettingsDto {
  @IsOptional()
  @IsString()
  sender_name?: string;

  @IsOptional()
  @IsEmail()
  sender_email?: string;

  @IsOptional()
  @IsString()
  active_sender_account_id?: string | null;
}
