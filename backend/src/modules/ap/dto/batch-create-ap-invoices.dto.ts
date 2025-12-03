import { Type } from 'class-transformer';
import { TaxType } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';

export enum ApPaymentFrequency {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
}

export class ApInvoiceImportItemDto {
  @IsString()
  vendorId!: string;

  @IsString()
  invoiceNo!: string;

  @IsNumber()
  amountOriginal!: number;

  @IsOptional()
  @IsEnum(TaxType)
  taxType?: TaxType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  amountCurrency?: string;

  @IsDateString()
  invoiceDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsEnum(ApPaymentFrequency)
  paymentFrequency?: ApPaymentFrequency;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BatchCreateApInvoicesDto {
  @IsString()
  entityId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApInvoiceImportItemDto)
  invoices!: ApInvoiceImportItemDto[];
}
