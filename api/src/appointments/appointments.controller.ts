import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Get()
  findAll(@Req() req: any, @Query('date') date?: string, @Query('resourceId') resourceId?: string) {
    return this.appointmentsService.findAll(req.user.branchId, date, resourceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.appointmentsService.findOne(id, req.user.branchId);
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
    return this.appointmentsService.create(req.user.branchId, dto);
  }

  @Post(':id/check-in')
  checkIn(@Param('id') id: string, @Req() req: any) {
    return this.appointmentsService.checkIn(id, req.user.branchId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.appointmentsService.updateStatus(id, req.user.branchId, status, reason);
  }
}
