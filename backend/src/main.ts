import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { NextFunction, Response } from 'express';
import { AppModule } from './app.module';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { corsOrigins } from './common/config/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  /*
  app.use((req, res, next) => {
    console.log(req.method, req.url);
    console.log(req.headers);
    next();
  });
*/
  const express = app.getHttpAdapter().getInstance() as {
    disable(setting: string): void;
    set(setting: string, value: unknown): void;
  };
  express.disable('x-powered-by');
  if (process.env.TRUST_PROXY === 'true') express.set('trust proxy', 1);
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.use((_request: unknown, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY === 'true') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Fleet Platform API')
    .setDescription('Fleet Platform Backend')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`🚀 Fleet Platform API running on http://localhost:${port}`);
}

bootstrap();
