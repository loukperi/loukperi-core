import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { LOUKPERI_PERMISSIONS } from 'src/common/permissions/permission-codes';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { CreateTaskFileDto } from './dto/create-task-file.dto';
import { TaskCollaborationService } from './task-collaboration.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tasks/:taskId')
export class TaskCollaborationController {
  constructor(private readonly collaborationService: TaskCollaborationService) {}

  @Permissions(LOUKPERI_PERMISSIONS.TASKS_VIEW)
  @Get('comments')
  listComments(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
  ) {
    return this.collaborationService.listComments(
      workspaceId,
      currentUser,
      taskId,
    );
  }

  @Permissions(LOUKPERI_PERMISSIONS.TASKS_COMMENTS_CREATE)
  @Post('comments')
  createComment(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskCommentDto,
  ) {
    return this.collaborationService.createComment(
      workspaceId,
      currentUser,
      taskId,
      dto,
    );
  }

  @Permissions(LOUKPERI_PERMISSIONS.TASKS_VIEW)
  @Get('files')
  listFiles(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
  ) {
    return this.collaborationService.listFiles(
      workspaceId,
      currentUser,
      taskId,
    );
  }

  /**
   * Legacy metadata-only endpoint.
   * Το κρατάμε για compatibility με παλιότερο frontend flow.
   */
  @Permissions(LOUKPERI_PERMISSIONS.TASKS_FILES_UPLOAD)
  @Post('files')
  createFileMetadata(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskFileDto,
  ) {
    return this.collaborationService.createFile(
      workspaceId,
      currentUser,
      taskId,
      dto,
    );
  }

  /**
   * Phase 2W real upload endpoint.
   * Field name: file
   */
  @Permissions(LOUKPERI_PERMISSIONS.TASKS_FILES_UPLOAD)
  @Post('files/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  uploadFile(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
    @UploadedFile() file: any,
  ) {
    return this.collaborationService.uploadFile(
      workspaceId,
      currentUser,
      taskId,
      file,
    );
  }

  @Permissions(LOUKPERI_PERMISSIONS.TASKS_VIEW)
  @Get('files/:fileId/download')
  async downloadFile(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
    @Param('fileId') fileId: string,
  ) {
    const downloadable = await this.collaborationService.downloadFile(
      workspaceId,
      currentUser,
      taskId,
      fileId,
    );

    return new StreamableFile(downloadable.stream, {
      type: downloadable.mimeType,
      disposition: `attachment; filename="${downloadable.safeDownloadName}"`,
    });
  }

  @Permissions(LOUKPERI_PERMISSIONS.TASKS_FILES_DELETE)
  @Delete('files/:fileId')
  deleteFile(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.collaborationService.deleteFile(
      workspaceId,
      currentUser,
      taskId,
      fileId,
    );
  }

  @Permissions(LOUKPERI_PERMISSIONS.TASKS_ACTIVITY_VIEW)
  @Get('activity')
  listActivity(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
  ) {
    return this.collaborationService.listActivity(
      workspaceId,
      currentUser,
      taskId,
    );
  }
}
