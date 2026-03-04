import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JobOrdersService } from './job-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobStatus } from '@prisma/client';

@Controller('job-orders')
@UseGuards(JwtAuthGuard)
export class JobOrdersController {
  constructor(private jobOrdersService: JobOrdersService) {}

  @Get()
  findAll(@Req() req: any, @Query('status') status?: JobStatus, @Query('date') date?: string) {
    return this.jobOrdersService.findAll(req.user.branchId, status, date);
  }

  @Get('board')
  findBoardGrouped(@Req() req: any) {
    return this.jobOrdersService.findBoardGrouped(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.jobOrdersService.findOne(id, req.user.branchId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: JobStatus, @Req() req: any) {
    return this.jobOrdersService.updateStatus(id, req.user.branchId, status);
  }

  @Patch(':id/assign')
  assignResource(@Param('id') id: string, @Body('resourceId') resourceId: string, @Req() req: any) {
    return this.jobOrdersService.assignResource(id, req.user.branchId, resourceId);
  }

  @Patch(':id/items')
  updateItems(@Param('id') id: string, @Body('items') items: any[], @Req() req: any) {
    return this.jobOrdersService.updateItems(id, req.user.branchId, items);
  }
}
