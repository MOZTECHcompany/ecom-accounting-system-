import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, IsBoolean } from 'class-validator';
import { ProductType } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salesPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  purchaseCost?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsOptional()
  attributes?: any;

  @IsString()
  @IsNotEmpty()
  barcode: string;

  @IsString()
  @IsOptional()
  sn?: string;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salesPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  purchaseCost?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsOptional()
  attributes?: any;
}
