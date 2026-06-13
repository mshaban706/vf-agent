import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { TasksService } from './tasks.service';

class CreateTaskDto {
  @IsUUID()
  workspace_id!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsString()
  agent_slug?: string;

  @IsOptional()
  @IsUUID()
  document_id?: string;

  @IsOptional()
  @IsString()
  pipeline_id?: string;

  @IsOptional()
  @IsIn(['standard', 'advanced', 'vf95'])
  depth_level?: string;

  @IsOptional()
  @IsBoolean()
  use_document_context?: boolean;

  @IsOptional()
  @IsBoolean()
  require_qa_review?: boolean;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  task_type?: string;

  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;
}

class UpdateTaskStatusDto {
  @IsIn(['pending', 'in_progress', 'needs_approval', 'completed', 'failed', 'cancelled'])
  status!: string;
}

type AuthedRequest = { accessToken: string; user: { id: string } };

@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get()
  list(
    @Req() req: { accessToken: string },
    @Query('workspace_id') workspaceId: string,
    @Query('status') status?: string,
  ) {
    return this.tasks.list(req.accessToken, workspaceId, status);
  }

  @Post()
  createManual(@Req() req: AuthedRequest, @Body() dto: CreateTaskDto) {
    return this.tasks.createManual(req.accessToken, req.user.id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateTaskStatusDto) {
    return this.tasks.updateStatus(req.accessToken, req.user.id, id, dto.status);
  }

  @Get(':id')
  getById(@Req() req: { accessToken: string }, @Param('id') id: string) {
    return this.tasks.getById(req.accessToken, id);
  }

  @Get(':id/logs')
  getLogs(@Req() req: { accessToken: string }, @Param('id') id: string) {
    return this.tasks.getLogs(req.accessToken, id);
  }
}
