import { Global, Module } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { RolesGuard } from './roles.guard';
import { EntityAccessGuard } from './entity-access.guard';
import { EntityAccessService } from '../entity-access/entity-access.service';

@Global()
@Module({
  providers: [
    PermissionsGuard,
    RolesGuard,
    EntityAccessGuard,
    EntityAccessService,
  ],
  exports: [
    PermissionsGuard,
    RolesGuard,
    EntityAccessGuard,
    EntityAccessService,
  ],
})
export class GuardsModule {}
