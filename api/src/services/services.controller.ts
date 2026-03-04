import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { PriceQuoteDto } from './dto/price-quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.servicesService.findAll(req.user.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.servicesService.findOne(id, req.user.branchId);
  }

  @Post()
  create(@Body() dto: CreateServiceDto, @Req() req: any) {
    return this.servicesService.create(req.user.branchId, dto);
  }

  @Post('pricing/quote')
  getPriceQuote(@Body() dto: PriceQuoteDto, @Req() req: any) {
    return this.servicesService.getPriceQuote(req.user.branchId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateServiceDto>, @Req() req: any) {
    return this.servicesService.update(id, req.user.branchId, dto);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string, @Req() req: any) {
    return this.servicesService.deactivate(id, req.user.branchId);
  }
}
