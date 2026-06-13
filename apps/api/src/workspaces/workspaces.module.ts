import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { LiveLogsModule } from '../live-logs/live-logs.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [LiveLogsModule, AgentsModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
