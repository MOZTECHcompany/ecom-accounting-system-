import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const AFTER_SALES_REASON_CATEGORIES = [
  'repair',
  'exchange',
  'return',
  'warranty',
  'trade_in_upgrade',
  'other',
] as const;

class CreateAfterSalesCaseItemDto {
  @ApiProperty({ description: 'ERP 商品 ID', required: false })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ description: '商品 SKU 快照', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sku?: string;

  @ApiProperty({ description: '商品名稱快照', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  itemName?: string;

  @ApiProperty({ description: '數量', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity?: number;

  @ApiProperty({ description: '單價', required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPriceOriginal?: number;

  @ApiProperty({ description: '是否需要付款', required: false })
  @IsOptional()
  @IsBoolean()
  paymentRequired?: boolean;

  @ApiProperty({ description: '應付金額', required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paymentAmountOriginal?: number;

  @ApiProperty({ description: '項目備註', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateAfterSalesCaseDto {
  @ApiProperty({ description: '公司實體 ID' })
  @IsUUID()
  entityId!: string;

  @ApiProperty({ description: 'ERP 客戶 ID', required: false })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ description: '原銷售訂單 ID', required: false })
  @IsOptional()
  @IsUUID()
  originalSalesOrderId?: string;

  @ApiProperty({ description: '案件日期', required: false })
  @IsOptional()
  @IsDateString()
  caseDate?: string;

  @ApiProperty({
    description: '案件原因分類',
    enum: AFTER_SALES_REASON_CATEGORIES,
  })
  @IsIn(AFTER_SALES_REASON_CATEGORIES)
  reasonCategory!: (typeof AFTER_SALES_REASON_CATEGORIES)[number];

  @ApiProperty({ description: '幣別', required: false, default: 'TWD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ description: '案件備註', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiProperty({
    description: '售後商品明細',
    type: [CreateAfterSalesCaseItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAfterSalesCaseItemDto)
  items!: CreateAfterSalesCaseItemDto[];
}

export class SetAfterSalesItemPaymentRequiredDto {
  @ApiProperty({ description: '是否需要付款' })
  @IsBoolean()
  paymentRequired!: boolean;

  @ApiProperty({ description: '應付金額', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paymentAmountOriginal?: number;
}

export class ShipAfterSalesCaseDto {
  @ApiProperty({ description: '物流追蹤號碼', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  trackingNo?: string;
}
