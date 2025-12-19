import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FulfillSalesOrderDto {
  @ApiProperty({ description: '出貨倉庫 ID' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: '商品序號 (ItemId -> SerialNumbers[])', required: false })
  @IsOptional()
  @IsObject()
  itemSerialNumbers?: Record<string, string[]>;
}
