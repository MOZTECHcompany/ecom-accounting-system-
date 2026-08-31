import { ShoplineController } from './shopline.controller';

describe('ShoplineController scheduler endpoint', () => {
  it('accepts the empty Cloud Scheduler request body', async () => {
    const service = {
      assertSchedulerToken: jest.fn(),
      autoSync: jest.fn().mockResolvedValue({ success: true }),
    };
    const controller = new ShoplineController(service as never);

    await expect(controller.autoSync('sync-token', undefined)).resolves.toEqual(
      { success: true },
    );
    expect(service.assertSchedulerToken).toHaveBeenCalledWith('sync-token');
    expect(service.autoSync).toHaveBeenCalledWith({
      entityId: undefined,
      since: undefined,
      until: undefined,
      trigger: 'scheduler',
    });
  });
});
