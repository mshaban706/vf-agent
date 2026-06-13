import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { SettingsService, AppSettingsDto } from './settings.service';

class SaveApiKeyDto {
  @IsUUID()
  workspace_id!: string;

  @IsIn(['openai', 'anthropic', 'gemini', 'deepseek'])
  provider!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  key!: string;
}

class SaveAppSettingsDto implements AppSettingsDto {
  @IsUUID()
  workspace_id!: string;

  @IsOptional()
  @IsIn(['openai', 'anthropic', 'gemini', 'deepseek'])
  default_provider?: string;

  @IsOptional()
  @IsString()
  default_model?: string;

  @IsOptional()
  @IsBoolean()
  require_email_approval?: boolean;

  @IsOptional()
  @IsBoolean()
  require_wordpress_approval?: boolean;

  @IsOptional()
  @IsBoolean()
  require_ads_approval?: boolean;

  @IsOptional()
  @IsBoolean()
  require_file_delete_approval?: boolean;

  @IsOptional()
  @IsBoolean()
  sandbox_mode?: boolean;

  @IsOptional()
  @IsString()
  default_output_depth?: string;

  @IsOptional()
  @IsBoolean()
  always_use_document_context?: boolean;

  @IsOptional()
  @IsBoolean()
  auto_quality_improvement?: boolean;

  @IsOptional()
  @IsBoolean()
  require_source_labels?: boolean;

  @IsOptional()
  @IsBoolean()
  require_missing_data_section?: boolean;

  @IsOptional()
  @IsBoolean()
  require_aeo_geo_section?: boolean;

  @IsOptional()
  @IsBoolean()
  require_local_seo_section?: boolean;

  @IsOptional()
  @IsBoolean()
  require_schema_internal_links?: boolean;

  @IsOptional()
  @IsBoolean()
  require_cro_section?: boolean;
}

type AuthedRequest = { accessToken: string; user: { id: string } };

@Controller('settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get('app')
  getApp(@Req() req: AuthedRequest, @Query('workspace_id') workspaceId: string) {
    return this.settings.getAppSettings(req.accessToken, workspaceId, req.user.id);
  }

  @Put('app')
  saveApp(@Req() req: AuthedRequest, @Body() dto: SaveAppSettingsDto) {
    const { workspace_id, ...updates } = dto;
    return this.settings.saveAppSettings(req.accessToken, workspace_id, req.user.id, updates);
  }

  @Get('api-keys')
  listApiKeys(@Req() req: AuthedRequest, @Query('workspace_id') workspaceId: string) {
    return this.settings.listApiKeys(req.accessToken, workspaceId);
  }

  @Post('api-keys')
  saveApiKey(@Req() req: AuthedRequest, @Body() dto: SaveApiKeyDto) {
    return this.settings.saveApiKey(
      req.accessToken,
      req.user.id,
      dto.workspace_id,
      dto.provider,
      dto.label || dto.provider,
      dto.key,
    );
  }

  @Delete('api-keys/:id')
  deleteApiKey(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.settings.deleteApiKey(req.accessToken, id);
  }

  @Post('api-keys/:id/test')
  testApiKey(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.settings.testApiKey(req.accessToken, id);
  }
}
