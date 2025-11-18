import { Module } from '@nestjs/common';
import { ArController } from './ar.controller';
import { ArService } from './ar.service';
import { ArRepository } from './ar.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ArController],
  providers: [ArService, ArRepository],
  exports: [ArService],
})
export class ArModule {}
