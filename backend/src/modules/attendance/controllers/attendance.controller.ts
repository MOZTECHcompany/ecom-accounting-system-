import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AttendanceService } from '../services/attendance.service';
import { ClockInDto } from '../dto/clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  async clockIn(@Request() req: any, @Body() dto: ClockInDto) {
    return this.attendanceService.clockIn(req.user.id, dto);
  }

  @Post('clock-out')
  async clockOut(@Request() req: any, @Body() dto: ClockOutDto) {
    return this.attendanceService.clockOut(req.user.id, dto);
  }

  @Get('admin/daily-summary')
  async getDailySummary(@Query('date') dateString: string) {
    const date = dateString ? new Date(dateString) : new Date();
    return this.attendanceService.getDailySummaries(date);
  }
}
