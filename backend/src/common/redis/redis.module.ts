import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const ttl = configService.get('CACHE_TTL', 600) * 1000;
        const redisEnabled = configService.get('REDIS_ENABLED', 'false') === 'true';
        const redisHost = configService.get<string>('REDIS_HOST', '').trim();
        const redisPort = configService.get('REDIS_PORT', 6379);

        if (!redisEnabled || !redisHost) {
          return {
            ttl,
          };
        }

        return {
          store: await redisStore({
            host: redisHost,
            port: redisPort,
            ttl,
          }),
          ttl,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisEnabled = configService.get('REDIS_ENABLED', 'false') === 'true';
        const redisHost = configService.get<string>('REDIS_HOST', '').trim();
        const redisPort = configService.get('REDIS_PORT', 6379);

        if (!redisEnabled || !redisHost) {
          return null;
        }

        return new Redis({
          host: redisHost,
          port: redisPort,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT', CacheModule], // Export CacheModule so others can use it
})
export class RedisModule {}
