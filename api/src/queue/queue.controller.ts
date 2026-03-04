import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { QueueService } from './queue.service';
import { CreateQueueTicketDto } from './dto/create-queue-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueStatus } from '@prisma/client';

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(private queueService: QueueService) {}

  @Get()
  findToday(@Req() req: any, @Query('status') status?: QueueStatus) {
    return this.queueService.findToday(req.user.branchId, status);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.queueService.getStats(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.queueService.findOne(id, req.user.branchId);
  }

  @Post()
  create(@Body() dto: CreateQueueTicketDto, @Req() req: any) {
    return this.queueService.create(req.user.branchId, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: QueueStatus, @Req() req: any) {
    return this.queueService.updateStatus(id, req.user.branchId, status);
  }
}
