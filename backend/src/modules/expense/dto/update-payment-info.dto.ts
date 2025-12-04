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
}
