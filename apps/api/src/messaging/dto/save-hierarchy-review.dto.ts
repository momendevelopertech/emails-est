import { HierarchyNominationRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class SaveHierarchyReviewRowDto {
    @IsString()
    targetRecipientId!: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number | null;

    @IsOptional()
    @IsString()
    comment?: string | null;

    @IsOptional()
    @IsEnum(HierarchyNominationRole)
    nominationRole?: HierarchyNominationRole | null;
}

export class SaveHierarchyReviewDto {
    @IsString()
    token!: string;

    @IsArray()
    @ArrayMaxSize(2000)
    @ValidateNested({ each: true })
    @Type(() => SaveHierarchyReviewRowDto)
    rows!: SaveHierarchyReviewRowDto[];
}
