import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  normalizeBoolean,
  normalizeInteger,
  normalizeNullableString,
  normalizeString,
} from './create-sender-email-account.dto';

export class UpdateSenderEmailAccountDto {
  @Transform(({ value }) => normalizeString(value))
  @IsOptional()
  @IsString()
  label?: string;

  @Transform(({ value }) => normalizeString(value))
  @IsOptional()
  @IsString()
  sender_name?: string;

  @Transform(({ value }) => normalizeString(value))
  @IsOptional()
  @IsEmail()
  sender_email?: string;

  @Transform(({ value }) => normalizeString(value))
  @IsOptional()
  @IsString()
  smtp_host?: string;

  @Transform(({ value }) => normalizeInteger(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtp_port?: number;

  @Transform(({ value }) => normalizeBoolean(value))
  @IsOptional()
  @IsBoolean()
  smtp_secure?: boolean;

  @Transform(({ value }) => normalizeBoolean(value))
  @IsOptional()
  @IsBoolean()
  smtp_require_tls?: boolean;

  @Transform(({ value }) => normalizeString(value))
  @IsOptional()
  @IsString()
  smtp_username?: string;

  @Transform(({ value }) => normalizeNullableString(value))
  @IsOptional()
  @IsString()
  smtp_password?: string | null;

  @Transform(({ value }) => normalizeInteger(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  smtp_daily_limit?: number;
}
