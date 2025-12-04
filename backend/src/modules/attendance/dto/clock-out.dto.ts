import { IsEnum, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, IsIP } from 'class-validator';
import { AttendanceMethod } from '@prisma/client';

export class ClockOutDto {
  @IsNotEmpty()
  @IsEnum(AttendanceMethod)
  method: AttendanceMethod;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  deviceInfo?: any;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
