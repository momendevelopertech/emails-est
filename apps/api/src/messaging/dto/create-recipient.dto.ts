import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateRecipientDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsEmail()
    email?: string | null;

    @IsOptional()
    @IsString()
    phone?: string | null;

    @IsOptional()
    @IsString()
    exam_type?: string | null;

    @IsOptional()
    @IsString()
    role?: string | null;

    @IsOptional()
    @IsString()
    day?: string | null;

    @IsOptional()
    @IsString()
    date?: string | null;

    @IsOptional()
    @IsString()
    test_center?: string | null;

    @IsOptional()
    @IsString()
    faculty?: string | null;

    @IsOptional()
    @IsString()
    room?: string | null;

    @IsOptional()
    @IsString()
    address?: string | null;

    @IsOptional()
    @IsString()
    map_link?: string | null;

    @IsOptional()
    @IsString()
    arrival_time?: string | null;
}
