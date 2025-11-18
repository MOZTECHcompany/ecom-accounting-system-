import {
  IsString,
  IsArray,
  IsNumber,
  IsDateString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BankTransactionItemDto {
  @ApiProperty({ description: '交易日期', example: '2025-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: '交易金額', example: 1500 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: '幣別', example: 'TWD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: '交易摘要/說明', example: '匯款入帳' })
  @IsString()
  description: string;

  @ApiProperty({
    description: '虛擬帳號（如有）',
    example: '88812345678901',
    required: false,
  })
  @IsString()
  virtualAccount?: string;

  @ApiProperty({
    description: '對方戶名',
    example: '王小明',
    required: false,
  })
  @IsString()
  counterpartyName?: string;
}

export class ImportBankTransactionsDto {
  @ApiProperty({ description: '銀行帳戶ID' })
  @IsUUID()
  bankAccountId: string;

  @ApiProperty({ description: '銀行交易清單', type: [BankTransactionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankTransactionItemDto)
  transactions: BankTransactionItemDto[];
}
