import { Module } from '@nestjs/common';
import { AttendanceController } from './controllers/attendance.controller';
import { LeaveController } from './controllers/leave.controller';
import { AttendanceService } from './services/attendance.service';
import { ScheduleService } from './services/schedule.service';
import { PolicyService } from './services/policy.service';
import { LeaveService } from './services/leave.service';
import { AnomalyService } from './services/anomaly.service';
import { BalanceService } from './services/balance.service';
import { GpsValidationStrategy } from './strategies/gps-validation.strategy';
import { IpValidationStrategy } from './strategies/ip-validation.strategy';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceController, LeaveController],
  providers: [
    AttendanceService,
    ScheduleService,
    PolicyService,
    LeaveService,
    AnomalyService,
    BalanceService,
    GpsValidationStrategy,
    IpValidationStrategy,
  ],
  exports: [AttendanceService, LeaveService],
})
export class AttendanceModule {}
