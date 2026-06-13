import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { CryptoService } from '../common/crypto.service';
import { LiveLogsModule } from '../live-logs/live-logs.module';

@Module({
  imports: [LiveLogsModule],
  controllers: [SettingsController],
  providers: [SettingsService, CryptoService],
  exports: [SettingsService],
})
export class SettingsModule {}
