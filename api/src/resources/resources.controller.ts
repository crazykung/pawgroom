import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceType } from '@prisma/client';

@Controller('resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get()
  findAll(@Req() req: any, @Query('type') type?: ResourceType) {
    return this.resourcesService.findAll(req.user.branchId, type);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.resourcesService.findOne(id, req.user.branchId);
  }

  @Get(':id/availability')
  getAvailability(@Param('id') id: string, @Query('date') date: string, @Req() req: any) {
    return this.resourcesService.getAvailability(id, req.user.branchId, date);
  }

  @Post()
  create(@Body() dto: { userId?: string; type: ResourceType; name: string }, @Req() req: any) {
    return this.resourcesService.create(req.user.branchId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.resourcesService.update(id, req.user.branchId, dto);
  }

  @Post(':id/working-hours')
  setWorkingHours(@Param('id') id: string, @Body('hours') hours: any[], @Req() req: any) {
    return this.resourcesService.setWorkingHours(id, req.user.branchId, hours);
  }

  @Post(':id/time-off')
  addTimeOff(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.resourcesService.addTimeOff(id, req.user.branchId, dto);
  }
}
