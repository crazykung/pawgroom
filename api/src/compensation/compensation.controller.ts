import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CompensationService } from './compensation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('compensation')
@UseGuards(JwtAuthGuard)
export class CompensationController {
  constructor(private compensationService: CompensationService) {}

  @Get('plans')
  getPlans(@Req() req: any) {
    return this.compensationService.getPlans(req.user.branchId);
  }

  @Post('plans')
  createPlan(@Body() dto: any, @Req() req: any) {
    return this.compensationService.createPlan(req.user.branchId, dto);
  }

  @Get('periods')
  getPeriods(@Req() req: any) {
    return this.compensationService.getPeriods(req.user.branchId);
  }

  @Post('periods')
  createPeriod(@Body('startDate') startDate: string, @Body('endDate') endDate: string, @Req() req: any) {
    return this.compensationService.createPeriod(req.user.branchId, new Date(startDate), new Date(endDate));
  }

  @Get('periods/:id/summary')
  getPeriodSummary(@Param('id') id: string, @Req() req: any) {
    return this.compensationService.getPeriodSummary(id, req.user.branchId);
  }

  @Post('periods/:id/close')
  closePeriod(@Param('id') id: string, @Req() req: any) {
    return this.compensationService.closePeriod(id, req.user.branchId);
  }

  @Post('periods/:id/mark-paid')
  markPaid(@Param('id') id: string, @Req() req: any) {
    return this.compensationService.markPaid(id, req.user.branchId);
  }

  @Post('periods/:id/adjustments')
  addAdjustment(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.compensationService.addAdjustment(id, req.user.branchId, dto);
  }
}
