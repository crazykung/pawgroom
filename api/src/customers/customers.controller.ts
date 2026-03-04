import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  findAll(@Req() req: any, @Query('search') search?: string) {
    return this.customersService.findAll(req.user.branchId, search);
  }

  @Get('lookup')
  lookup(@Req() req: any, @Query('phone') phone: string) {
    return this.customersService.findByPhone(phone, req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.customersService.findOne(id, req.user.branchId);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto, @Req() req: any) {
    return this.customersService.create(req.user.branchId, req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @Req() req: any) {
    return this.customersService.update(id, req.user.branchId, dto);
  }

  @Post(':id/tags')
  addTag(@Param('id') id: string, @Body('tag') tag: string, @Req() req: any) {
    return this.customersService.addTag(id, req.user.branchId, tag);
  }
}
