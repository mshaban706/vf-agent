import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private files: FilesService) {}

  @Get(':id/download')
  async download(
    @Req() req: { accessToken: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { stream, fileName, mimeType } = await this.files.getDownloadStream(req.accessToken, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    stream.pipe(res);
  }
}
