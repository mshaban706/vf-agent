import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Shared NestJS configuration for local server and Vercel serverless. */
export async function configureApp(app: INestApplication): Promise<void> {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = app.get(ConfigService);
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');

  app.enableCors({
    origin: [corsOrigin, 'http://localhost:5173', 'file://'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
}
