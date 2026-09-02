import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityAccessGuard } from './entity-access.guard';

describe('EntityAccessGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const entityAccessService = { assertAccess: jest.fn() };

  const context = (request: Record<string, unknown>) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    entityAccessService.assertAccess.mockResolvedValue({});
  });

  it('skips public scheduler endpoints', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    const guard = new EntityAccessGuard(
      reflector as any,
      entityAccessService as any,
    );

    await expect(guard.canActivate(context({}))).resolves.toBe(true);
    expect(entityAccessService.assertAccess).not.toHaveBeenCalled();
  });

  it('checks unique entity ids from query and body', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('accounting');
    const guard = new EntityAccessGuard(
      reflector as any,
      entityAccessService as any,
    );

    await guard.canActivate(
      context({
        user: { id: 'user-1' },
        query: { entityId: ' entity-1 ' },
        body: { entityId: 'entity-1' },
        params: {},
      }),
    );

    expect(entityAccessService.assertAccess).toHaveBeenCalledTimes(1);
    expect(entityAccessService.assertAccess).toHaveBeenCalledWith(
      'user-1',
      'accounting',
      'entity-1',
    );
  });

  it('rejects a request without an authenticated user', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('accounting');
    const guard = new EntityAccessGuard(
      reflector as any,
      entityAccessService as any,
    );

    await expect(
      guard.canActivate(context({ query: {}, body: {}, params: {} })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects non-string entity ids', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('accounting');
    const guard = new EntityAccessGuard(
      reflector as any,
      entityAccessService as any,
    );

    await expect(
      guard.canActivate(
        context({
          user: { id: 'user-1' },
          query: { entityId: ['entity-1'] },
          body: {},
          params: {},
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
