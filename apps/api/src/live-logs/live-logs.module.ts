import { Module } from '@nestjs/common';
import { LiveLogsController } from './live-logs.controller';
import { LiveLogsService } from './live-logs.service';

@Module({
  controllers: [LiveLogsController],
  providers: [LiveLogsService],
  exports: [LiveLogsService],
})
export class LiveLogsModule {}
