import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('summary')
  summary(@Req() req: { accessToken: string }, @Query('workspace_id') workspaceId: string) {
    return this.reports.summary(req.accessToken, workspaceId);
  }
}
