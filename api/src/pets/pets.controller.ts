import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetsController {
  constructor(private petsService: PetsService) {}

  @Get('by-customer/:customerId')
  findByCustomer(@Param('customerId') customerId: string, @Req() req: any) {
    return this.petsService.findByCustomer(customerId, req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.petsService.findOne(id, req.user.branchId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @Req() req: any) {
    return this.petsService.getGroomingHistory(id, req.user.branchId);
  }

  @Post()
  create(@Body() dto: CreatePetDto, @Req() req: any) {
    const { customerId, ...rest } = dto;
    return this.petsService.create(customerId, req.user.branchId, rest as any);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePetDto, @Req() req: any) {
    return this.petsService.update(id, req.user.branchId, dto);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string, @Req() req: any) {
    return this.petsService.deactivate(id, req.user.branchId);
  }
}
