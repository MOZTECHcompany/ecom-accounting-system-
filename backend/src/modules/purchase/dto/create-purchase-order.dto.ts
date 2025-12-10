import { IsString, IsDateString, IsArray, ValidateNested, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseOrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  qty: number;

  @IsNumber()
  unitCost: number; // Original currency cost
}

export class CreatePurchaseOrderDto {
  @IsString()
  vendorId: string;

  @IsDateString()
  orderDate: string;

  @IsString()
  currency: string;

  @IsNumber()
  fxRate: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
