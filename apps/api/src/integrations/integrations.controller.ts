import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { IsObject, IsUUID } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { IntegrationsService } from './integrations.service';

class SaveIntegrationDto {
  @IsUUID()
  workspace_id!: string;

  @IsObject()
  config!: Record<string, unknown>;
}

@Controller('integrations')
@UseGuards(AuthGuard)
export class IntegrationsController {
  constructor(private integrations: IntegrationsService) {}

  @Get()
  list(@Req() req: { accessToken: string }, @Query('workspace_id') workspaceId: string) {
    return this.integrations.list(req.accessToken, workspaceId);
  }

  @Put(':provider')
  save(
    @Req() req: { accessToken: string },
    @Param('provider') provider: string,
    @Body() dto: SaveIntegrationDto,
  ) {
    return this.integrations.save(req.accessToken, dto.workspace_id, provider, dto.config);
  }
}
