import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Req() req: any, @Query('branchId') branchId?: string) {
    return this.usersService.findAll(req.user.tenantId, branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.usersService.findOne(id, req.user.tenantId);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string, @Req() req: any) {
    return this.usersService.getPermissions(id, req.user.tenantId);
  }

  @Get('me/permissions')
  getMyPermissions(@Req() req: any) {
    return this.usersService.getPermissions(req.user.sub, req.user.tenantId);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.usersService.create(req.user.tenantId, req.user.branchId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    return this.usersService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string, @Req() req: any) {
    return this.usersService.deactivate(id, req.user.tenantId);
  }
}
