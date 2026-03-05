import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getTemplates(branchId: string) {
    return this.prisma.reportTemplate.findMany({
      where: { branchId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTemplate(id: string, branchId: string) {
    const tpl = await this.prisma.reportTemplate.findFirst({ where: { id, branchId } });
    if (!tpl) throw new NotFoundException('Report template not found');
    return tpl;
  }

  async createTemplate(branchId: string, dto: {
    name: string;
    templateType?: any;
    datasetCode: string;
    designJson: any;
    paperJson?: any;
  }) {
    return this.prisma.reportTemplate.create({ data: { ...dto, branchId } });
  }

  async updateTemplate(id: string, branchId: string, dto: Partial<{
    name: string;
    designJson: any;
    paperJson: any;
    isPublished: boolean;
  }>) {
    await this.getTemplate(id, branchId);
    return this.prisma.reportTemplate.update({
      where: { id },
      data: { ...dto, version: { increment: 1 } },
    });
  }

  // ── Data Queries ───────────────────────────────────────────────────────────

  async querySalesData(branchId: string, dateFrom: string, dateTo: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        branchId,
        status: 'issued',
        issuedAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      },
      include: {
        lines: true,
        payments: true,
        customer: { select: { id: true, firstName: true, lastName: true } },
        jobOrder: {
          include: {
            pet: { select: { name: true, species: true, sizeTier: true } },
            resource: { select: { name: true } },
          },
        },
      },
      orderBy: { issuedAt: 'asc' },
    });

    const rows = invoices.map((inv) => ({
      date: inv.issuedAt?.toISOString().slice(0, 10),
      docNo: inv.docNo,
      customerName: inv.customer
        ? `${inv.customer.firstName} ${inv.customer.lastName}`
        : '',
      petName: inv.jobOrder?.pet?.name ?? '',
      species: inv.jobOrder?.pet?.species ?? '',
      sizeTier: inv.jobOrder?.pet?.sizeTier ?? '',
      groomer: inv.jobOrder?.resource?.name ?? '',
      grossSales: parseFloat(inv.subtotal.toString()),
      discountAmount: parseFloat(inv.discountAmount.toString()),
      netSales:
        parseFloat(inv.total.toString()) -
        parseFloat(inv.vatAmount.toString()),
      vatAmount: parseFloat(inv.vatAmount.toString()),
      total: parseFloat(inv.total.toString()),
      paymentMethod: inv.payments[0]?.method ?? '',
    }));

    const summary = {
      totalGross: rows.reduce((s, r) => s + r.grossSales, 0),
      totalDiscount: rows.reduce((s, r) => s + r.discountAmount, 0),
      totalNet: rows.reduce((s, r) => s + r.netSales, 0),
      totalVat: rows.reduce((s, r) => s + r.vatAmount, 0),
      invoiceCount: rows.length,
    };

    return { rows, summary };
  }

  async queryGroomingStats(branchId: string, dateFrom: string, dateTo: string) {
    const jobs = await this.prisma.jobOrder.findMany({
      where: {
        branchId,
        status: 'completed',
        endAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      },
      include: {
        pet: { select: { species: true, sizeTier: true } },
        items: { include: { service: { select: { name: true, category: true } } } },
        resource: { select: { name: true } },
      },
    });

    return jobs.map((job) => ({
      date: job.endAt?.toISOString().slice(0, 10),
      groomer: job.resource?.name ?? '',
      species: job.pet.species,
      sizeTier: job.pet.sizeTier,
      services: job.items.map((i) => i.service.name).join(', '),
      revenue: job.items.reduce(
        (s, i) => s + parseFloat(i.appliedPrice.toString()),
        0,
      ),
    }));
  }

  async queryTaxData(branchId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return this.prisma.invoice.findMany({
      where: {
        branchId,
        docType: 'tax_invoice',
        status: 'issued',
        issuedAt: { gte: startDate, lte: endDate },
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        lines: true,
      },
      orderBy: { docNo: 'asc' },
    });
  }
}
