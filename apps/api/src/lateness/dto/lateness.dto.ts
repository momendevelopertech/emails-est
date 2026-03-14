import { Type } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

export class CreateLatenessDto {
    @IsDateString()
    date: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    minutesLate: number;
}
