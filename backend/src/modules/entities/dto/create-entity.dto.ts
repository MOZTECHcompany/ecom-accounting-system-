import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateEntityDto {
  @ApiProperty({ example: 'tw-entity-001', description: '實體代碼（唯一）' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: '台灣總公司', description: '實體名稱' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'TWD', description: '基礎貨幣' })
  @IsString()
  @IsNotEmpty()
  baseCurrency: string;

  @ApiProperty({ example: 'TW', description: '國家代碼' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    example: '12345678',
    description: '統一編號',
    required: false,
  })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({
    example: true,
    description: '是否啟用',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
