import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TaxType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateReimbursementItemDto {
  @ApiProperty({ description: '所屬實體 ID' })
  @IsString()
  entityId!: string;

  @ApiProperty({ description: '報銷項目名稱' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '對應會計科目 ID' })
  @IsString()
  accountId!: string;

  @ApiPropertyOptional({ description: '項目描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '關鍵字列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: '金額上限 (TWD)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountLimit?: number;

  @ApiPropertyOptional({ description: '預設稅別', enum: TaxType })
  @IsOptional()
  @IsEnum(TaxType)
  defaultTaxType?: TaxType;

  @ApiPropertyOptional({ description: '是否需部門主管覆核' })
  @IsOptional()
  @IsBoolean()
  requiresDepartmentHead?: boolean;

  @ApiPropertyOptional({ description: '指定審批角色代碼', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverRoleCodes?: string[];

  @ApiPropertyOptional({ description: '綁定審批政策 ID' })
  @IsOptional()
  @IsString()
  approvalPolicyId?: string;

  @ApiPropertyOptional({ description: '預設憑證類型' })
  @IsOptional()
  @IsString()
  defaultReceiptType?: string;

  @ApiPropertyOptional({ description: '允許的憑證類型', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedReceiptTypes?: string[];

  @ApiPropertyOptional({ description: '允許的角色代碼', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @ApiPropertyOptional({ description: '允許的部門 ID', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDepartments?: string[];

  @ApiPropertyOptional({ description: '是否啟用' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateReimbursementItemDto extends PartialType(
  CreateReimbursementItemDto,
) {}
