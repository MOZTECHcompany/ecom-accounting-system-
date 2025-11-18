import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsRepository } from './approvals.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ApprovalsService, ApprovalsRepository],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
