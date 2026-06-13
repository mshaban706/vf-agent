import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT', 4000);
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');

  app.enableCors({
    origin: [corsOrigin, 'http://localhost:5173', 'file://'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  await app.listen(port);
  console.log(`🚀 VF Agent Command Center API running on http://localhost:${port}`);
}

bootstrap();
