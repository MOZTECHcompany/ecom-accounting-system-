import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertPayrollPolicyDto {
  @ApiPropertyOptional({ description: '公司實體 ID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: '月薪換算工時', example: 240 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(744)
  standardMonthlyHours?: number;

  @ApiPropertyOptional({ description: '加班倍率', example: 1.33 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  overtimeMultiplier?: number;

  @ApiPropertyOptional({ description: '台灣勞保員工自付比例', example: 0.022 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  twLaborInsuranceRate?: number;

  @ApiPropertyOptional({ description: '台灣健保員工自付比例', example: 0.015 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  twHealthInsuranceRate?: number;

  @ApiPropertyOptional({ description: '中國社保員工自付比例', example: 0.105 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  cnSocialInsuranceRate?: number;
}
