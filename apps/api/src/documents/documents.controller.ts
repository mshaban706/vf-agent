import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { DocumentsService } from './documents.service';

type AuthedRequest = { accessToken: string; user: { id: string } };

@Controller('documents')
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private documents: DocumentsService) {}

  @Get()
  list(
    @Req() req: AuthedRequest,
    @Query('workspace_id') workspaceId: string,
    @Query('client_id') clientId?: string,
  ) {
    return this.documents.list(req.accessToken, workspaceId, clientId);
  }

  @Get(':id/chunks')
  getChunks(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.documents.getChunks(req.accessToken, id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  upload(
    @Req() req: AuthedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Query('workspace_id') workspaceId: string,
    @Query('client_id') clientId?: string,
    @Query('title') title?: string,
  ) {
    return this.documents.ingestUpload(req.accessToken, req.user.id, workspaceId, file, clientId, title);
  }
}
