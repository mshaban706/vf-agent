import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { validateEnv } from './config/env.validation';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ClientsModule } from './clients/clients.module';
import { AgentsModule } from './agents/agents.module';
import { TasksModule } from './tasks/tasks.module';
import { CommandsModule } from './commands/commands.module';
import { SettingsModule } from './settings/settings.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { EventsModule } from './events/events.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { LiveLogsModule } from './live-logs/live-logs.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ReportsModule } from './reports/reports.module';
import { DocumentsModule } from './documents/documents.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        '../../.env',
        'apps/api/.env',
      ],
      validate: validateEnv,
    }),

    SupabaseModule,
    AuthModule,
    WorkspacesModule,
    ClientsModule,
    AgentsModule,
    TasksModule,
    CommandsModule,
    SettingsModule,
    ApprovalsModule,
    EventsModule,
    OrchestratorModule,
    LiveLogsModule,
    IntegrationsModule,
    ReportsModule,
    DocumentsModule,
    IntelligenceModule,
    FilesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}