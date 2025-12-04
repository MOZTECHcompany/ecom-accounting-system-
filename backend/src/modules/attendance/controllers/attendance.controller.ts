import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AttendanceService } from '../services/attendance.service';
import { ClockInDto } from '../dto/clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  async clockIn(@Request() req, @Body() dto: ClockInDto) {
    return this.attendanceService.clockIn(req.user.id, dto);
  }

  @Post('clock-out')
  async clockOut(@Request() req, @Body() dto: ClockOutDto) {
    return this.attendanceService.clockOut(req.user.id, dto);
  }
}
