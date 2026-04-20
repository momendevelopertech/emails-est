import { IsOptional, IsString } from 'class-validator';

export class TestWhatsAppSettingsDto {
  @IsOptional()
  @IsString()
  message?: string;
}
