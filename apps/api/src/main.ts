import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await configureApp(app);

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT', 4000);

  await app.listen(port);
  console.log(`🚀 VF Agent Command Center API running on http://localhost:${port}`);
}

bootstrap();
