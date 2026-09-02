import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './common/prisma/prisma.service';
import { IS_PUBLIC_KEY } from './common/decorators/public.decorator';

describe('AppController', () => {
  let appController: AppController;
  let queryRaw: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([{ result: 1 }]);
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: { $queryRaw: queryRaw },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('marks liveness and readiness as public endpoints', () => {
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, AppController.prototype.health),
      ).toBe(true);
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, AppController.prototype.readiness),
      ).toBe(true);
    });

    it('returns a minimal liveness response', () => {
      expect(appController.health()).toEqual({ status: 'ok' });
    });

    it('returns ready when the database responds', async () => {
      await expect(appController.readiness()).resolves.toEqual({
        status: 'ready',
      });
    });

    it('fails readiness without exposing the database error', async () => {
      queryRaw.mockRejectedValueOnce(new Error('sensitive connection detail'));

      await expect(appController.readiness()).rejects.toEqual(
        new ServiceUnavailableException({ status: 'not_ready' }),
      );
    });
  });
});
