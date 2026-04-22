import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const disasterClosureScopeTypes = [
  'ENTITY',
  'DEPARTMENT',
  'EMPLOYEE',
  'LOCATION',
] as const;

export const disasterClosurePayPolicies = [
  'NO_DEDUCTION',
  'UNPAID',
  'PARTIAL',
] as const;

export class UpsertDisasterClosureDto {
  @IsOptional()
  @IsString()
  entityId?: string;

  @IsString()
  name!: string;

  @IsString()
  closureDate!: string;

  @IsOptional()
  @IsIn(disasterClosureScopeTypes)
  scopeType?: (typeof disasterClosureScopeTypes)[number];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopeIds?: string[];

  @IsOptional()
  @IsIn(disasterClosurePayPolicies)
  payPolicy?: (typeof disasterClosurePayPolicies)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  paidPercentage?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  announcementRegion?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
