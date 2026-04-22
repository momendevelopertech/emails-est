import { IsIn } from 'class-validator';

export class UpdateRecipientResponseDto {
    @IsIn(['PENDING', 'CONFIRMED', 'DECLINED'])
    status!: 'PENDING' | 'CONFIRMED' | 'DECLINED';
}
