import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, InvoiceDocType } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string, dateFrom?: string, dateTo?: string) {
    const where: any = { branchId, status: { not: 'draft' } };
    if (dateFrom || dateTo) {
      where.issuedAt = {};
      if (dateFrom) where.issuedAt.gte = new Date(dateFrom);
      if (dateTo) where.issuedAt.lte = new Date(dateTo);
    }
    return this.prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        lines: true,
        payments: true,
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(id: string, branchId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, branchId },
      include: {
        customer: true,
        jobOrder: { include: { pet: true, assignedResource: { select: { id: true, name: true } } } },
        lines: true,
        payments: true,
        creditNotes: true,
      },
    });
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);
    return inv;
  }

  async createFromJob(jobOrderId: string, branchId: string, docType: InvoiceDocType = 'receipt') {
    const job = await this.prisma.jobOrder.findFirst({
      where: { id: jobOrderId, branchId },
      include: {
        items: { include: { service: true } },
        pet: { include: { customer: true } },
        invoices: { where: { status: { not: 'void' } } },
      },
    });
    if (!job) throw new NotFoundException(`Job ${jobOrderId} not found`);
    if (job.invoices.length > 0) throw new BadRequestException('Job already has an active invoice');

    // ดึง VAT rate จาก settings
    const profile = await this.prisma.companyProfile.findFirst({ where: { branchId } });
    const vatRate = profile ? parseFloat(profile.vatRate.toString()) : 7;

    const lines = job.items.map((item) => {
      const unitPrice = parseFloat(item.appliedPrice.toString());
      const lineTotal = unitPrice * item.quantity;
      const vatAmount = parseFloat(profile?.pricesVatIncluded ? '0' : ((lineTotal * vatRate) / 100).toFixed(2));
      return {
        lineType: 'service' as const,
        description: item.service.name,
        quantity: item.quantity,
        unitPrice,
        vatRate,
        vatAmount,
        lineTotal,
        sortOrder: 0,
      };
    });

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const vatAmount = lines.reduce((s, l) => s + l.vatAmount, 0);
    const total = subtotal + vatAmount;

    return this.prisma.invoice.create({
      data: {
        branchId,
        jobOrderId,
        customerId: job.pet.customerId,
        docType,
        subtotal,
        vatRate,
        vatAmount,
        total,
        lines: { createMany: { data: lines } },
      },
      include: { lines: true },
    });
  }

  async issue(id: string, branchId: string) {
    const inv = await this.findOne(id, branchId);
    if (inv.status !== 'draft') throw new BadRequestException('Invoice is already issued');

    // สร้าง docNo
    const docNo = await this.generateDocNo(branchId, inv.docType);

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'issued', docNo, issuedAt: new Date() },
    });
  }

  async addPayment(id: string, branchId: string, method: PaymentMethod, amount: number, refCode?: string) {
    const inv = await this.findOne(id, branchId);
    if (inv.status !== 'issued') throw new BadRequestException('Invoice must be issued first');

    const totalPaid = inv.payments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
    if (totalPaid + amount > parseFloat(inv.total.toString())) {
      throw new BadRequestException('Payment exceeds invoice total');
    }

    const payment = await this.prisma.payment.create({
      data: { invoiceId: id, method, amount, refCode, paidAt: new Date() },
    });

    // อัพเดตยอดลูกค้า
    const newTotal = totalPaid + amount;
    if (newTotal >= parseFloat(inv.total.toString())) {
      await this.prisma.customer.update({
        where: { id: inv.customerId },
        data: {
          totalVisits: { increment: 1 },
          totalSpend: { increment: parseFloat(inv.total.toString()) },
          lastVisitAt: new Date(),
        },
      });
    }

    return payment;
  }

  async voidInvoice(id: string, branchId: string, reason: string) {
    const inv = await this.findOne(id, branchId);
    if (inv.status === 'void') throw new BadRequestException('Already voided');
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'void', voidedAt: new Date(), notes: reason },
    });
  }

  private async generateDocNo(branchId: string, docType: InvoiceDocType): Promise<string> {
    const year = new Date().getFullYear();
    const dbDocType = docType === 'receipt' ? 'receipt' : 'tax_invoice';

    const seq = await this.prisma.documentSequence.upsert({
      where: { branchId_docType_year: { branchId, docType: dbDocType as any, year } },
      update: { runningNo: { increment: 1 } },
      create: { branchId, docType: dbDocType as any, prefix: docType === 'receipt' ? 'RC' : 'TX', runningNo: 1, year },
    });

    const prefix = docType === 'receipt' ? 'RC' : 'TX';
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `${prefix}${year}${month}${String(seq.runningNo).padStart(4, '0')}`;
  }
}
