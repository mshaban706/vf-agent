import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { WorkspacesService } from './workspaces.service';

class CreateWorkspaceDto {
  @IsString()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;
}

@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private workspaces: WorkspacesService) {}

  @Get()
  list(@Req() req: { accessToken: string }) {
    return this.workspaces.list(req.accessToken);
  }

  @Post('ensure-default')
  ensureDefault(@Req() req: { accessToken: string; user: { id: string } }) {
    return this.workspaces.ensureDefault(req.accessToken, req.user.id);
  }

  @Post()
  create(
    @Req() req: { accessToken: string; user: { id: string } },
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaces.create(req.accessToken, req.user.id, dto.name, dto.slug);
  }

  @Get(':id')
  getById(@Req() req: { accessToken: string }, @Param('id') id: string) {
    return this.workspaces.getById(req.accessToken, id);
  }

  @Get(':id/stats')
  getStats(@Req() req: { accessToken: string }, @Param('id') id: string) {
    return this.workspaces.getStats(req.accessToken, id);
  }
}
