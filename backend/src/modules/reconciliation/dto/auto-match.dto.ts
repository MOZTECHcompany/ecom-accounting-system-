import { IsString, IsDateString, IsUUID, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AutoMatchDto {
  @ApiProperty({ description: '銀行帳戶ID' })
  @IsUUID()
  bankAccountId: string;

  @ApiProperty({ description: '開始日期', example: '2025-01-01' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ description: '結束日期', example: '2025-01-31' })
  @IsDateString()
  dateTo: string;

  @ApiProperty({
    description: '日期容差（天數）',
    example: 3,
    required: false,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  dateTolerance?: number;

  @ApiProperty({
    description: '金額容差（絕對值）',
    example: 1,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  amountTolerance?: number;

  @ApiProperty({
    description: '是否使用模糊匹配',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  useFuzzyMatch?: boolean;
}
