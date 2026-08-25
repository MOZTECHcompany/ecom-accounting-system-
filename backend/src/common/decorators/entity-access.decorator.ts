import { SetMetadata } from '@nestjs/common';
import { DataAccessModule } from '../entity-access/entity-access.service';

export const ENTITY_ACCESS_MODULE_KEY = 'entityAccessModule';

export const RequireEntityAccess = (module: DataAccessModule) =>
  SetMetadata(ENTITY_ACCESS_MODULE_KEY, module);
