import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PreviewInvoiceDto {
  @ApiProperty({
    description: '交易ID（訂單、付款、退款等）',
    example: 'uuid-of-transaction',
  })
  @IsUUID()
  transactionId: string;

  @ApiProperty({
    description: '交易類型',
    enum: ['order', 'payment', 'refund'],
    example: 'order',
  })
  @IsEnum(['order', 'payment', 'refund'])
  transactionType: string;

  @ApiProperty({
    description: '發票類型：B2C(個人) 或 B2B(公司)',
    enum: ['B2C', 'B2B'],
    example: 'B2C',
    required: false,
  })
  @IsOptional()
  @IsEnum(['B2C', 'B2B'])
  invoiceType?: string;

  @ApiProperty({
    description: '買方統一編號（B2B發票必填）',
    example: '12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  buyerTaxId?: string;
}
