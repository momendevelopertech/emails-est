import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateNoteDto {
    @IsDateString()
    date: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    body?: string;
}
