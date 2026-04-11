import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ImportRecipientDto } from './import-recipient.dto';

describe('ImportRecipientDto', () => {
    it('trims values and drops invalid emails during import', async () => {
        const dto = plainToInstance(ImportRecipientDto, {
            name: '  Dina Hasan Mohamed  ',
            email: 'shrouk.tarek deraya.edu.eg',
            role: '  Head  ',
            room: ' 201 ',
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.name).toBe('Dina Hasan Mohamed');
        expect(dto.email).toBeUndefined();
        expect(dto.role).toBe('Head');
        expect(dto.room).toBe('201');
    });

    it('keeps valid emails after normalization', async () => {
        const dto = plainToInstance(ImportRecipientDto, {
            name: 'Ahmed Ali Hassan Mohamed',
            email: 'ahmed.ali@example.com',
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.email).toBe('ahmed.ali@example.com');
    });
});
