import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './common/prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) { }

  @Get('debug')
  async debug() {
    try {
      // Test DB Connection
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        db: 'connected',
        env: {
          NODE_ENV: process.env.NODE_ENV,
          HAS_DB_URL: !!process.env.DATABASE_URL,
          // Mask password
          DB_URL_MASKED: process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@'),
        }
      };
    } catch (e) {
      return {
        status: 'error',
        db: 'disconnected',
        error: e.message,
        stack: e.stack,
        env: {
          HAS_DB_URL: !!process.env.DATABASE_URL,
          DB_URL_MASKED: process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@'),
        }
      };
    }
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      cloudRun: {
        service: process.env.K_SERVICE,
        revision: process.env.K_REVISION,
        configuration: process.env.K_CONFIGURATION,
        project: process.env.GOOGLE_CLOUD_PROJECT,
        region: process.env.CLOUD_RUN_REGION,
      },
    };
  }
}
