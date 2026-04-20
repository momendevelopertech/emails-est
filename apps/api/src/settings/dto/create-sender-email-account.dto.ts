import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const normalizeString = (value: unknown) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length ? normalized : undefined;
};

const normalizeNullableString = (value: unknown) => {
  if (value === null) {
    return null;
  }

  return normalizeString(value);
};

const normalizeBoolean = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
};

const normalizeInteger = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export class CreateSenderEmailAccountDto {
  @Transform(({ value }) => normalizeString(value) ?? '')
  @IsString()
  @IsNotEmpty()
  label: string;

  @Transform(({ value }) => normalizeString(value) ?? '')
  @IsString()
  @IsNotEmpty()
  sender_name: string;

  @Transform(({ value }) => normalizeString(value) ?? '')
  @IsEmail()
  sender_email: string;

  @Transform(({ value }) => normalizeString(value) ?? '')
  @IsString()
  @IsNotEmpty()
  smtp_host: string;

  @Transform(({ value }) => normalizeInteger(value) ?? 587)
  @IsInt()
  @Min(1)
  @Max(65535)
  smtp_port: number;

  @Transform(({ value }) => normalizeBoolean(value) ?? false)
  @IsBoolean()
  smtp_secure: boolean;

  @Transform(({ value }) => normalizeBoolean(value) ?? true)
  @IsBoolean()
  smtp_require_tls: boolean;

  @Transform(({ value }) => normalizeString(value) ?? '')
  @IsString()
  @IsNotEmpty()
  smtp_username: string;

  @Transform(({ value }) => normalizeString(value) ?? '')
  @IsString()
  @IsNotEmpty()
  smtp_password: string;

  @Transform(({ value }) => normalizeInteger(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  smtp_daily_limit?: number;
}

export { normalizeBoolean, normalizeInteger, normalizeNullableString, normalizeString };
