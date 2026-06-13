import { Module } from '@nestjs/common';
import { AiProviderService } from '../orchestrator/ai-provider.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [AiProviderService],
  exports: [AiProviderService],
})
export class AiProviderModule {}
