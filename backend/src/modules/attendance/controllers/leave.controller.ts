import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { LeaveService } from '../services/leave.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('attendance/leaves')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  async createLeaveRequest(@Request() req: any, @Body() dto: CreateLeaveRequestDto) {
    return this.leaveService.createLeaveRequest(req.user.id, dto);
  }

  @Get()
  async getLeaveRequests(@Request() req: any) {
    return this.leaveService.getLeaveRequests(req.user.id);
  }
}
