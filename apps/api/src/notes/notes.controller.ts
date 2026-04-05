import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotesService } from './notes.service';
import { DateRangeQueryDto } from '../shared/dto/date-range.dto';
import { CreateNoteDto, UpdateNoteDto } from './dto/notes.dto';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
    constructor(private notesService: NotesService) { }

    @Get()
    findAll(@Req() req: any, @Query() query: DateRangeQueryDto) {
        return this.notesService.findAll(req.user.id, req.user.role, { from: query.from, to: query.to });
    }

    @Post()
    create(@Req() req: any, @Body() body: CreateNoteDto) {
        return this.notesService.create(req.user.id, body);
    }

    @Patch(':id')
    update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateNoteDto) {
        return this.notesService.update(req.user.id, id, body);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id') id: string) {
        return this.notesService.remove(req.user.id, id);
    }
}
