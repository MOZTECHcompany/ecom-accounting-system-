import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, RolesGuard],
  exports: [PermissionsService],
})
export class PermissionsModule {}
