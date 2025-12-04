import { IsNotEmpty, IsString, IsDateString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsNotEmpty()
  @IsString()
  leaveTypeId: string;

  @IsNotEmpty()
  @IsDateString()
  startAt: string;

  @IsNotEmpty()
  @IsDateString()
  endAt: string;

  @IsNotEmpty()
  @IsNumber()
  hours: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  documents?: any[];
}
