import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { TasksModule } from '../tasks/tasks.module';
import { EventsModule } from '../events/events.module';
import { LiveLogsModule } from '../live-logs/live-logs.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { ResearchWorkbookModule } from '../research-workbook/research-workbook.module';

@Module({
  imports: [TasksModule, EventsModule, LiveLogsModule, IntelligenceModule, AiProviderModule, ResearchWorkbookModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
