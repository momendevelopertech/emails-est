import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotesService } from './notes.service';
import { DateRangeQueryDto } from '../shared/dto/date-range.dto';
import { CreateNoteDto } from './dto/notes.dto';

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
}
