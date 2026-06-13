import { Module } from '@nestjs/common';
import { ContextPackService } from './context-pack.service';
import { IntelligenceService } from './intelligence.service';
import { LiveLogsModule } from '../live-logs/live-logs.module';
import { AiProviderModule } from '../ai-provider/ai-provider.module';

@Module({
  imports: [LiveLogsModule, AiProviderModule],
  providers: [ContextPackService, IntelligenceService],
  exports: [ContextPackService, IntelligenceService],
})
export class IntelligenceModule {}
