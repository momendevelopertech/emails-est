import { IsString } from 'class-validator';

export class SwapRecipientWithSpareDto {
    @IsString()
    sparePhone!: string;
}
