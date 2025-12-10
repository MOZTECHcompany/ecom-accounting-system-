import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export enum AssemblyType {
  ASSEMBLE = 'ASSEMBLE',
  DISASSEMBLE = 'DISASSEMBLE',
}

export class CreateAssemblyOrderDto {
  @IsString()
  productId: string; // The finished good (Bundle/Manufactured)

  @IsString()
  warehouseId: string;

  @IsNumber()
  quantity: number;

  @IsEnum(AssemblyType)
  type: AssemblyType;

  @IsOptional()
  @IsString()
  notes?: string;
}
