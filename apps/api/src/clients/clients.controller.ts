import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { ClientsService } from './clients.service';

class CreateClientBody {
  @IsUUID()
  workspace_id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  service_area?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  radius_miles?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller('clients')
@UseGuards(AuthGuard)
export class ClientsController {
  constructor(private clients: ClientsService) {}

  @Get()
  list(@Req() req: { accessToken: string }, @Query('workspace_id') workspaceId: string) {
    return this.clients.list(req.accessToken, workspaceId);
  }

  @Post()
  create(@Req() req: { accessToken: string; user: { id: string } }, @Body() dto: CreateClientBody) {
    return this.clients.create(req.accessToken, req.user.id, dto);
  }

  @Get(':id')
  getById(@Req() req: { accessToken: string }, @Param('id') id: string) {
    return this.clients.getById(req.accessToken, id);
  }

  @Patch(':id')
  update(
    @Req() req: { accessToken: string },
    @Param('id') id: string,
    @Body() dto: Partial<CreateClientBody>,
  ) {
    return this.clients.update(req.accessToken, id, dto);
  }
}
