import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';

export class SubmitExpenseFeedbackDto {
  @ApiProperty({ description: '分類器原始建議科目 ID', required: false })
  @IsOptional()
  @IsUUID()
  suggestedAccountId?: string;

  @ApiProperty({ description: '財務最終選擇的科目 ID', required: false })
  @IsOptional()
  @IsUUID()
  chosenAccountId?: string;

  @ApiPropertyOptional({ description: 'AI 建議的報銷項目 ID', required: false })
  @IsOptional()
  @IsUUID()
  suggestedItemId?: string;

  @ApiPropertyOptional({ description: '財務最終選擇的報銷項目 ID', required: false })
  @IsOptional()
  @IsUUID()
  chosenItemId?: string;

  @ApiPropertyOptional({
    description: '標籤：correct / incorrect / needs_review',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: '信心水準 0-1 (預設取 request 上的值)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({ description: '敘述或備註，會寫入 classifier feedback' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '用於訓練的原始特徵 JSON' })
  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '附註' })
  @IsOptional()
  @IsString()
  comment?: string;
}
