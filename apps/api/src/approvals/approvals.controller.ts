import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { ApprovalsService } from './approvals.service';

class ReviewDto {
  @IsBoolean()
  approved!: boolean;
}

@Controller('approvals')
@UseGuards(AuthGuard)
export class ApprovalsController {
  constructor(private approvals: ApprovalsService) {}

  @Get()
  list(
    @Req() req: { accessToken: string },
    @Query('workspace_id') workspaceId: string,
    @Query('status') status?: string,
  ) {
    return this.approvals.list(req.accessToken, workspaceId, status);
  }

  @Post(':id/review')
  review(
    @Req() req: { accessToken: string; user: { id: string } },
    @Param('id') id: string,
    @Body() dto: ReviewDto,
  ) {
    return this.approvals.review(req.accessToken, id, req.user.id, dto.approved);
  }
}
