import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ENTITY_ACCESS_MODULE_KEY } from '../decorators/entity-access.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  DataAccessModule,
  EntityAccessService,
} from '../entity-access/entity-access.service';

type AuthenticatedRequest = Request & {
  user?: { id?: string };
  body?: Record<string, unknown>;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
};

@Injectable()
export class EntityAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entityAccessService: EntityAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const module = this.reflector.getAllAndOverride<DataAccessModule>(
      ENTITY_ACCESS_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!module) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;
    if (!userId) {
      throw new ForbiddenException('Authenticated user is required');
    }

    const entityIds = this.collectEntityIds(request);
    for (const entityId of entityIds) {
      await this.entityAccessService.assertAccess(userId, module, entityId);
    }
    return true;
  }

  private collectEntityIds(request: AuthenticatedRequest): string[] {
    const values = [
      request.query?.entityId,
      request.body?.entityId,
      request.params?.entityId,
    ].filter((value) => value !== undefined && value !== null);

    const ids = new Set<string>();
    for (const value of values) {
      if (typeof value !== 'string' || !value.trim()) {
        throw new BadRequestException('entityId must be a non-empty string');
      }
      ids.add(value.trim());
    }
    return [...ids];
  }
}
