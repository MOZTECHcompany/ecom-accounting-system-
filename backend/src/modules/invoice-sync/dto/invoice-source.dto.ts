import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export enum InvoiceSourceConnector {
  GMAIL = 'gmail',
  ECOUNT = 'ecount',
  MANUAL_EXPORT = 'manual_export',
}

export enum InvoiceDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
  BOTH = 'both',
}

export enum InvoiceDocumentType {
  INVOICE = 'invoice',
  ALLOWANCE = 'allowance',
  VOID = 'void',
}

export class UpsertInvoiceSourceDto {
  @IsString()
  entityId!: string;

  @IsEnum(InvoiceSourceConnector)
  connector!: InvoiceSourceConnector;

  @IsString()
  @MaxLength(320)
  sourceKey!: string;

  @IsEnum(InvoiceDirection)
  direction!: InvoiceDirection;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;
}

export class InvoiceSourceRecordDto {
  @IsString()
  @MaxLength(500)
  externalRecordId!: string;

  @IsEnum(InvoiceDirection)
  direction!: InvoiceDirection.INCOMING | InvoiceDirection.OUTGOING;

  @IsOptional()
  @IsEnum(InvoiceDocumentType)
  documentType?: InvoiceDocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  sellerTaxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  buyerTaxId?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  amountNet?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  amountTax?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  amountGross?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  amountCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  evidenceHash?: string;

  @IsOptional()
  @IsDateString()
  sourceUpdatedAt?: string;

  @IsOptional()
  @IsObject()
  rawMetadata?: Record<string, unknown>;
}

export class IngestInvoiceSourceRecordsDto {
  @IsString()
  entityId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => InvoiceSourceRecordDto)
  records!: InvoiceSourceRecordDto[];
}
