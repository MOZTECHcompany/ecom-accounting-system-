import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApPaymentFrequency } from './batch-create-ap-invoices.dto';

export class UpdateApInvoiceDto {
  @IsOptional()
  @IsEnum(ApPaymentFrequency)
  paymentFrequency?: ApPaymentFrequency;

  @IsOptional()
  @IsBoolean()
  isRecurringMonthly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  recurringDayOfMonth?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
