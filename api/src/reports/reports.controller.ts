import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('templates')
  getTemplates(@Req() req: any) {
    return this.reportsService.getTemplates(req.user.branchId);
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string, @Req() req: any) {
    return this.reportsService.getTemplate(id, req.user.branchId);
  }

  @Post('templates')
  createTemplate(@Body() dto: any, @Req() req: any) {
    return this.reportsService.createTemplate(req.user.branchId, dto);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.reportsService.updateTemplate(id, req.user.branchId, dto);
  }

  @Get('data/sales')
  querySales(
    @Req() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.reportsService.querySalesData(req.user.branchId, dateFrom, dateTo);
  }

  @Get('data/grooming')
  queryGrooming(
    @Req() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.reportsService.queryGroomingStats(req.user.branchId, dateFrom, dateTo);
  }

  @Get('data/tax')
  queryTax(
    @Req() req: any,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.reportsService.queryTaxData(req.user.branchId, year, month);
  }
}
