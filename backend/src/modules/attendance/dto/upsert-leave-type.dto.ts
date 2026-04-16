import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertLeaveTypeDto {
  @IsOptional()
  @IsString()
  entityId?: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsIn(['CALENDAR_YEAR', 'HIRE_ANNIVERSARY', 'NONE'])
  balanceResetPolicy?: 'CALENDAR_YEAR' | 'HIRE_ANNIVERSARY' | 'NONE';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDaysPerYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  paidPercentage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minNoticeHours?: number;

  @IsOptional()
  @IsBoolean()
  requiresDocument?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCarryOver?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  carryOverLimitHours?: number;
}
