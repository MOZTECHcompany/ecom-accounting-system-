import { Module } from '@nestjs/common';
import { EntitiesController } from './entities.controller';
import { EntitiesService } from './entities.service';
import { EntitiesRepository } from './entities.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EntitiesController],
  providers: [EntitiesService, EntitiesRepository],
  exports: [EntitiesService, EntitiesRepository],
})
export class EntitiesModule {}
