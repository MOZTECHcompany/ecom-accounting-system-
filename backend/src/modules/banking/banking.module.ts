import { Module } from '@nestjs/common';
import { BankingController } from './banking.controller';
import { BankingService } from './banking.service';
import { BankingRepository } from './banking.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BankingController],
  providers: [BankingService, BankingRepository],
  exports: [BankingService],
})
export class BankingModule {}
