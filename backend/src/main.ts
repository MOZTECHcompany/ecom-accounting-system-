import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const configService = app.get(ConfigService);

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

  // API 前綴
  const prefix = configService.get('API_PREFIX') || '/api/v1';
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
