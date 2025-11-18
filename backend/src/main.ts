import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
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
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  app.enableCors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(','),
    credentials: true,
  });

  // API 前綴
  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');
  app.setGlobalPrefix(apiPrefix);

  // 取得 port
  const port = configService.get<number>('PORT', 3000);

  // Swagger 文件設定
  const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED', true);
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('E-Commerce Accounting System API')
      .setDescription(
        '電商會計系統 API 文件\n\n' +
          '此系統專為電商設計，支援：\n' +
          '- 多公司實體（台灣、大陸等）\n' +
          '- 多幣別交易與匯率管理\n' +
          '- 多銷售平台（Shopify、momo、PChome、Shopee 等）\n' +
          '- 完整的會計分錄與四大報表\n' +
          '- 應收應付管理與銀行對帳\n' +
          '- 人事薪資管理',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', '使用者認證與授權')
      .addTag('Users', '使用者管理')
      .addTag('Accounting', '會計核心功能')
      .addTag('Sales', '銷售管理')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
  }

  // 啟動服務
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}${apiPrefix}`);
  logger.log(`Environment: ${configService.get<string>('NODE_ENV')}`);
}

bootstrap();
