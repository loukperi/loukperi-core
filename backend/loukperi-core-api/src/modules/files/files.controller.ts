import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Response } from 'express';
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

  @Post('records/:recordId/files/upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  uploadToRecord(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.filesService.uploadToRecord(
      workspaceId,
      currentUser,
      recordId,
      file,
    );
  }

  @Get('files/:fileId/download')
  async download(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const file = await this.filesService.getDownloadInfo(
      workspaceId,
      currentUser,
      fileId,
    );

    res.setHeader('Content-Type', file.mimeType);

    return res.download(file.absolutePath, file.fileName);
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