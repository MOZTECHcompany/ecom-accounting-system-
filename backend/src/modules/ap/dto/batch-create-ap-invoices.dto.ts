import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
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
