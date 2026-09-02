import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { EntitiesService } from './entities.service';

describe('EntitiesService company master updates', () => {
  it('updates only company master data and never creates an initial admin', async () => {
    const entity = {
      id: 'entity-1',
      loginCode: '900324',
      name: '萬博創意科技有限公司',
      taxId: '85030997',
    };
    const entitiesRepository = {
      findOne: jest.fn().mockResolvedValue(entity),
      update: jest.fn().mockResolvedValue(entity),
    };
    const prisma = {
      user: { findUnique: jest.fn() },
      employee: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    const service = new EntitiesService(
      entitiesRepository as never,
      prisma as never,
      {} as never,
    );

    const result = await service.update('entity-1', {
      taxId: '85030997',
    });

    expect(result).toEqual(entity);
    expect(entitiesRepository.update).toHaveBeenCalledWith('entity-1', {
      taxId: '85030997',
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.employee.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects initial-admin fields from the update API contract', async () => {
    const dto = plainToInstance(UpdateEntityDto, {
      taxId: '85030997',
      adminEmployeeNo: 'unexpected-browser-autofill',
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'adminEmployeeNo' }),
      ]),
    );
  });
});
