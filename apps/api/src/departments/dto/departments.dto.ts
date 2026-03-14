import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, MinLength, IsInt, Min } from 'class-validator';

export class CreateDepartmentDto {
    @IsString()
    @MinLength(2)
    name: string;

    @IsOptional()
    @IsString()
    nameAr?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsArray()
    @ArrayNotEmpty()
    @Type(() => Number)
    @IsInt({ each: true })
    @Min(1, { each: true })
    branches: number[];
}

export class UpdateDepartmentDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    nameAr?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    @Type(() => Number)
    @IsInt({ each: true })
    @Min(1, { each: true })
    branches?: number[];
}
