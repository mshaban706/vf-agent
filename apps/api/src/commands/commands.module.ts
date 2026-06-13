import { Module } from '@nestjs/common';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { TasksModule } from '../tasks/tasks.module';
import { ClientsModule } from '../clients/clients.module';
import { LiveLogsModule } from '../live-logs/live-logs.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [OrchestratorModule, TasksModule, ClientsModule, LiveLogsModule, SupabaseModule],
  controllers: [CommandsController],
  providers: [CommandsService],
})
export class CommandsModule {}
