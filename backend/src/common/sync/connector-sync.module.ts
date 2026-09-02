import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConnectorSyncCoordinatorService } from './connector-sync-coordinator.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ConnectorSyncCoordinatorService],
  exports: [ConnectorSyncCoordinatorService],
})
export class ConnectorSyncModule {}
