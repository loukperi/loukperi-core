import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFileAttachmentDto } from './dto/create-file-attachment.dto';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-workspace-id',
  required: false,
  description: 'Workspace id. Optional if token has defaultWorkspaceId.',
})
@UseGuards(JwtAuthGuard)
@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('records/:recordId/files')
  listForRecord(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
  ) {
    return this.filesService.listForRecord(workspaceId, currentUser, recordId);
  }

  @Post('records/:recordId/files')
  attachToRecord(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
    @Body() dto: CreateFileAttachmentDto,
  ) {
    return this.filesService.attachToRecord(
      workspaceId,
      currentUser,
      recordId,
      dto,
    );
  }

  @Delete('files/:fileId')
  remove(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('fileId') fileId: string,
  ) {
    return this.filesService.remove(workspaceId, currentUser, fileId);
  }
}