import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { LiveLogsService, LiveLogLevel } from './live-logs.service';

class AddLogDto {
  @IsUUID()
  workspace_id!: string;

  @IsIn(['info', 'warning', 'error', 'success', 'debug'])
  level!: LiveLogLevel;

  @IsString()
  message!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@Controller('logs')
@UseGuards(AuthGuard)
export class LiveLogsController {
  constructor(private logs: LiveLogsService) {}

  @Get()
  list(
    @Req() req: { accessToken: string },
    @Query('workspace_id') workspaceId: string,
    @Query('level') level?: string,
  ) {
    return this.logs.list(req.accessToken, workspaceId, level);
  }

  @Post()
  async add(@Body() dto: AddLogDto) {
    await this.logs.add(dto.workspace_id, dto.level, dto.message, dto.metadata ?? {});
    return { ok: true };
  }
}
