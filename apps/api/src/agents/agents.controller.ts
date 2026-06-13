import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { VF_PIPELINES } from '@vf/shared';
import { AuthGuard } from '../auth/auth.guard';
import { AgentsService } from './agents.service';

class ExecuteAgentDto {
  @IsUUID()
  workspace_id!: string;

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsUUID()
  task_id?: string;

  @IsOptional()
  @IsUUID()
  document_id?: string;

  @IsOptional()
  @IsBoolean()
  use_document_context?: boolean;
}

@Controller('agents')
export class AgentsController {
  constructor(private agents: AgentsService) {}

  @Get()
  list(@Query('workspace_id') workspaceId?: string) {
    return this.agents.list(workspaceId);
  }

  @Get('pipelines/list')
  pipelines() {
    return VF_PIPELINES;
  }

  @Post('sync')
  @UseGuards(AuthGuard)
  sync(@Query('workspace_id') workspaceId?: string) {
    if (!workspaceId) throw new BadRequestException('workspace_id query parameter is required');
    return this.agents.syncValiantFirmAgentsForWorkspace(workspaceId);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.agents.getBySlug(slug);
  }

  @Post(':slug/execute')
  @UseGuards(AuthGuard)
  execute(@Req() req: { accessToken: string }, @Param('slug') slug: string, @Body() dto: ExecuteAgentDto) {
    return this.agents.execute(req.accessToken, slug, dto);
  }

  @Get(':slug/runs')
  @UseGuards(AuthGuard)
  getRuns(
    @Req() req: { accessToken: string },
    @Param('slug') slug: string,
    @Query('workspace_id') workspaceId: string,
  ) {
    return this.agents.getRuns(req.accessToken, slug, workspaceId);
  }

  @Get(':slug/tasks')
  @UseGuards(AuthGuard)
  getRecentTasks(
    @Req() req: { accessToken: string },
    @Param('slug') slug: string,
    @Query('workspace_id') workspaceId: string,
  ) {
    return this.agents.getRecentTasks(req.accessToken, slug, workspaceId);
  }
}
