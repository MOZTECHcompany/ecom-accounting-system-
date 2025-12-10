import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateBomDto {
  @IsString()
  @IsNotEmpty()
  childSku: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
