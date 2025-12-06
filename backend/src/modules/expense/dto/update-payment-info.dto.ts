import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePaymentInfoDto {
  @ApiPropertyOptional({ description: '付款方式 (現金, 銀行轉帳, 支票, 其他)' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ description: '付款狀態 (pending, processing, paid)', enum: ['pending', 'processing', 'paid'] })
  @IsString()
  @IsEnum(['pending', 'processing', 'paid'])
  paymentStatus: string;

  @ApiPropertyOptional({ description: '付款銀行名稱' })
  @IsString()
  @IsOptional()
  paymentBankName?: string;

  @ApiPropertyOptional({ description: '付款帳號末五碼' })
  @IsString()
  @IsOptional()
  paymentAccountLast5?: string;
}
