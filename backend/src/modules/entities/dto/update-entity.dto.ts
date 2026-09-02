import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEntityDto } from './create-entity.dto';

export class UpdateEntityDto extends PartialType(
  OmitType(CreateEntityDto, [
    'adminName',
    'adminEmail',
    'adminEmployeeNo',
    'adminPassword',
  ] as const),
) {}
