import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { CommandsService } from './commands.service';

class ExecuteCommandDto {
  @IsString()
  command!: string;

  @IsUUID()
  workspace_id!: string;

  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsUUID()
  document_id?: string;

  @IsOptional()
  @IsString()
  pipeline_id?: string;

  @IsOptional()
  use_document_context?: boolean;
}

@Controller('commands')
@UseGuards(AuthGuard)
export class CommandsController {
  constructor(private commands: CommandsService) {}

  @Post('execute')
  execute(
    @Req() req: { accessToken: string; user: { id: string } },
    @Body() dto: ExecuteCommandDto,
  ) {
    return this.commands.execute(req.accessToken, req.user.id, dto);
  }
}
