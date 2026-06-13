import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Express } from 'express';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

let cachedApp: Express | undefined;

/** Vercel serverless entry — cached Express instance backed by NestJS. */
export default async function handler(req: express.Request, res: express.Response) {
  if (!cachedApp) {
    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);
    const app = await NestFactory.create(AppModule, adapter, {
      logger: ['error', 'warn', 'log'],
    });
    await configureApp(app);
    await app.init();
    cachedApp = expressApp;
  }

  return cachedApp(req, res);
}
