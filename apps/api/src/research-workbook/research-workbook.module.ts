import { Module } from '@nestjs/common';
import { ResearchWorkbookService } from './research-workbook.service';
import { WorkbookBuilderService } from './workbook-builder.service';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { LiveLogsModule } from '../live-logs/live-logs.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [AiProviderModule, LiveLogsModule, SupabaseModule],
  providers: [ResearchWorkbookService, WorkbookBuilderService],
  exports: [ResearchWorkbookService, WorkbookBuilderService],
})
export class ResearchWorkbookModule {}
