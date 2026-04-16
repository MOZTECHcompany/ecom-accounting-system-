import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustLeaveBalanceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  accruedHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  carryOverHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  manualAdjustmentHours?: number;
}
