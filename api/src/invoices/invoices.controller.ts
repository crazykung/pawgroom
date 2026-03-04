import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoiceDocType, PaymentMethod } from '@prisma/client';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  findAll(@Req() req: any, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.invoicesService.findAll(req.user.branchId, dateFrom, dateTo);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.findOne(id, req.user.branchId);
  }

  @Post('from-job/:jobOrderId')
  createFromJob(
    @Param('jobOrderId') jobOrderId: string,
    @Body('docType') docType: InvoiceDocType,
    @Req() req: any,
  ) {
    return this.invoicesService.createFromJob(jobOrderId, req.user.branchId, docType);
  }

  @Post(':id/issue')
  issue(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.issue(id, req.user.branchId);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @Body('method') method: PaymentMethod,
    @Body('amount') amount: number,
    @Body('refCode') refCode: string,
    @Req() req: any,
  ) {
    return this.invoicesService.addPayment(id, req.user.branchId, method, amount, refCode);
  }

  @Post(':id/void')
  voidInvoice(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.invoicesService.voidInvoice(id, req.user.branchId, reason);
  }
}
