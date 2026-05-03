import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from 'src/common/decorators/current-user.decorator';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('records/:recordId/notes')
  listForRecord(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
  ) {
    return this.notesService.listForRecord(workspaceId, currentUser, recordId);
  }

  @Post('records/:recordId/notes')
  createForRecord(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.createForRecord(
      workspaceId,
      currentUser,
      recordId,
      dto,
    );
  }

  @Patch('notes/:noteId')
  update(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(workspaceId, currentUser, noteId, dto);
  }

  @Delete('notes/:noteId')
  remove(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('noteId') noteId: string,
  ) {
    return this.notesService.remove(workspaceId, currentUser, noteId);
  }
}