import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompensationService {
  constructor(private prisma: PrismaService) {}

  // ── Plans ──────────────────────────────────────────────────────────────────
  async getPlans(branchId: string) {
    return this.prisma.compPlan.findMany({
      where: { branchId, isActive: true },
      include: {
        rules: { include: { service: true } },
        assignments: { include: { resource: { select: { id: true, name: true } }, role: { select: { id: true, name: true } } } },
      },
    });
  }

  async createPlan(branchId: string, dto: { name: string; scope?: any; rules: Array<{ ruleType: any; appliesTo?: any; params: any; serviceId?: string }> }) {
    const { rules, ...planData } = dto;
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.compPlan.create({ data: { ...planData, branchId } });
      if (rules?.length) {
        await tx.compRule.createMany({
          data: rules.map((r) => ({ ...r, planId: plan.id })),
        });
      }
      return plan;
    });
  }

  // ── Periods ────────────────────────────────────────────────────────────────
  async getPeriods(branchId: string) {
    return this.prisma.compPeriod.findMany({
      where: { branchId },
      include: {
        transactions: {
          include: {
            resource: { select: { id: true, name: true } },
          },
        },
        adjustments: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async createPeriod(branchId: string, startDate: Date, endDate: Date) {
    const existing = await this.prisma.compPeriod.findFirst({
      where: { branchId, status: 'open' },
    });
    if (existing) throw new BadRequestException('มีรอบที่เปิดอยู่แล้ว กรุณาปิดรอบก่อน');

    return this.prisma.compPeriod.create({
      data: { branchId, startDate, endDate, status: 'open' },
    });
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  async getPeriodSummary(periodId: string, branchId: string) {
    const period = await this.prisma.compPeriod.findFirst({
      where: { id: periodId, branchId },
      include: {
        transactions: {
          include: { resource: { select: { id: true, name: true } } },
        },
        adjustments: true,
      },
    });
    if (!period) throw new NotFoundException('Period not found');

    // สรุปตาม resource
    const byResource: Record<string, { name: string; baseAmount: number; compAmount: number; jobCount: number }> = {};

    for (const tx of period.transactions) {
      const key = tx.resourceId;
      if (!byResource[key]) {
        byResource[key] = { name: tx.resource.name, baseAmount: 0, compAmount: 0, jobCount: 0 };
      }
      byResource[key].baseAmount += parseFloat(tx.baseAmount.toString());
      byResource[key].compAmount += parseFloat(tx.compAmount.toString());
      byResource[key].jobCount += 1;
    }

    // รวม adjustments
    for (const adj of period.adjustments) {
      if (adj.resourceId && byResource[adj.resourceId]) {
        byResource[adj.resourceId].compAmount += parseFloat(adj.amount.toString());
      }
    }

    const rows = Object.entries(byResource).map(([id, data]) => ({ resourceId: id, ...data }));
    const totalComp = rows.reduce((s, r) => s + r.compAmount, 0);

    return { period, rows, totalComp };
  }

  async closePeriod(periodId: string, branchId: string) {
    const period = await this.prisma.compPeriod.findFirst({
      where: { id: periodId, branchId, status: 'open' },
    });
    if (!period) throw new NotFoundException('Open period not found');

    return this.prisma.compPeriod.update({
      where: { id: periodId },
      data: { status: 'closed', closedAt: new Date() },
    });
  }

  async markPaid(periodId: string, branchId: string) {
    const period = await this.prisma.compPeriod.findFirst({
      where: { id: periodId, branchId, status: 'closed' },
    });
    if (!period) throw new NotFoundException('Closed period not found');

    return this.prisma.compPeriod.update({
      where: { id: periodId },
      data: { status: 'paid', paidAt: new Date() },
    });
  }

  async addAdjustment(periodId: string, branchId: string, dto: { type: any; resourceId?: string; amount: number; reason?: string }) {
    const period = await this.prisma.compPeriod.findFirst({ where: { id: periodId, branchId } });
    if (!period) throw new NotFoundException('Period not found');

    return this.prisma.compAdjustment.create({
      data: { ...dto, periodId },
    });
  }
}
