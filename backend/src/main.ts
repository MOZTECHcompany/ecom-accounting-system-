import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const configService = app.get(ConfigService);
  const prefix = configService.get('API_PREFIX') || '/api/v1';

  // Increase body limit for large file uploads and capture raw body for Shopify webhook HMAC
  app.use(
    json({
      limit: '50mb',
      verify: (req: any, res, buf) => {
        if (req.originalUrl?.startsWith(`${prefix}/integrations/shopify/webhook`)) {
          req.rawBody = buf.toString('utf8');
        }
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 全域驗證管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS 設定
  app.enableCors({
    origin: '*',
  });

  // Some hosting/CDN setups may send Reporting API (Report-To / NEL) beacons to
  // endpoints like `/report/*` or other custom paths. These are not part of our
  // public API (which is under `/api/v1/*`), but missing handlers can cause noisy
  // 404s in the browser console.
  // Swallow them with 204 to keep UX clean.
  app.use('/report', (req, res) => {
    res.status(204).end();
  });
  app.use('/import/erp', (req, res) => {
    res.status(204).end();
  });

  // Force restart trigger
  console.log('Server restarting...');

  // API 前綴
  app.setGlobalPrefix(prefix);

  // Swagger 文件設定（Production 也啟用）
  const config = new DocumentBuilder()
    .setTitle('Accounting API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // 啟動服務
  const port = configService.get('PORT') || 3000;

  await app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📘 Swagger available at /api-docs`);
  });
}

bootstrap();
