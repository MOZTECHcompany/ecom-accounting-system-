import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SerialNumberEntry {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsArray()
  @IsString({ each: true })
  serialNumbers: string[];
}

export class ReceivePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SerialNumberEntry)
  serialNumbers?: SerialNumberEntry[];
}
