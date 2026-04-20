import { IsOptional, IsString } from 'class-validator';

export class UpdateWhatsAppSettingsDto {
  @IsOptional()
  @IsString()
  api_url?: string;

  @IsOptional()
  @IsString()
  media_url?: string;

  @IsOptional()
  @IsString()
  id_instance?: string;

  @IsOptional()
  @IsString()
  api_token_instance?: string;
}
