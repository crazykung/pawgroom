import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@prisma/client';

@Injectable()
export class JobOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string, status?: JobStatus, date?: string) {
    const where: any = { branchId };
    if (status) where.status = status;
    if (date) {
      where.createdAt = {
        gte: new Date(`${date}T00:00:00+07:00`),
        lt: new Date(`${date}T23:59:59+07:00`),
      };
    }

    return this.prisma.jobOrder.findMany({
      where,
      include: {
        pet: { include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        items: { include: { service: true } },
        resource: { select: { id: true, name: true } },
        groomerSplits: { include: { resource: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findBoardGrouped(branchId: string) {
    const jobs = await this.findAll(branchId);
    return {
      checked_in: jobs.filter((j) => j.status === 'checked_in'),
      in_progress: jobs.filter((j) => j.status === 'in_progress'),
      ready: jobs.filter((j) => j.status === 'ready'),
      completed: jobs.filter((j) => j.status === 'completed'),
    };
  }

  async findOne(id: string, branchId: string) {
    const job = await this.prisma.jobOrder.findFirst({
      where: { id, branchId },
      include: {
        pet: { include: { customer: true } },
        items: { include: { service: { include: { priceRules: true } } } },
        resource: true,
        groomerSplits: { include: { resource: true } },
        invoices: true,
      },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async updateStatus(id: string, branchId: string, status: JobStatus) {
    const job = await this.findOne(id, branchId);
    const allowed: Record<JobStatus, JobStatus[]> = {
      checked_in: ['in_progress', 'cancelled'],
      in_progress: ['ready', 'cancelled'],
      ready: ['completed', 'in_progress'],
      completed: [],
      cancelled: [],
    };
    if (!allowed[job.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition ${job.status} → ${status}`);
    }
    const data: any = { status };
    if (status === 'in_progress') data.startAt = new Date();
    if (status === 'completed') data.endAt = new Date();

    return this.prisma.jobOrder.update({ where: { id }, data });
  }

  async assignResource(id: string, branchId: string, resourceId: string) {
    await this.findOne(id, branchId);
    return this.prisma.jobOrder.update({ where: { id }, data: { assignedResourceId: resourceId } });
  }

  async updateItems(id: string, branchId: string, items: Array<{ serviceId: string; appliedPrice: number; appliedDuration: number }>) {
    await this.findOne(id, branchId);
    return this.prisma.$transaction(async (tx) => {
      await tx.jobItem.deleteMany({ where: { jobOrderId: id } });
      await tx.jobItem.createMany({
        data: items.map((item) => ({ ...item, jobOrderId: id })),
      });
      return tx.jobOrder.findFirst({ where: { id }, include: { items: { include: { service: true } } } });
    });
  }
}
