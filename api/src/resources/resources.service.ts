import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResourceType } from '@prisma/client';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string, type?: ResourceType) {
    return this.prisma.resource.findMany({
      where: { branchId, isActive: true, ...(type && { type }) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        workingHours: { where: { isActive: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, branchId: string) {
    const r = await this.prisma.resource.findFirst({
      where: { id, branchId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        workingHours: true,
        timeOffs: { where: { endAt: { gt: new Date() } } },
      },
    });
    if (!r) throw new NotFoundException(`Resource ${id} not found`);
    return r;
  }

  async create(branchId: string, dto: { userId?: string; type: ResourceType; name: string }) {
    return this.prisma.resource.create({ data: { ...dto, branchId } });
  }

  async update(id: string, branchId: string, dto: Partial<{ name: string; isActive: boolean }>) {
    await this.findOne(id, branchId);
    return this.prisma.resource.update({ where: { id }, data: dto });
  }

  async setWorkingHours(id: string, branchId: string, hours: Array<{ dayOfWeek: number; startTime: string; endTime: string }>) {
    await this.findOne(id, branchId);
    return this.prisma.$transaction(async (tx) => {
      await tx.resourceWorkingHours.deleteMany({ where: { resourceId: id } });
      return tx.resourceWorkingHours.createMany({
        data: hours.map((h) => ({ ...h, resourceId: id })),
      });
    });
  }

  async addTimeOff(id: string, branchId: string, dto: { startAt: Date; endAt: Date; reason?: string }) {
    await this.findOne(id, branchId);
    return this.prisma.resourceTimeOff.create({ data: { ...dto, resourceId: id } });
  }

  async getAvailability(id: string, branchId: string, date: string) {
    const resource = await this.findOne(id, branchId);
    const day = new Date(date);
    const dayOfWeek = day.getDay();
    const workingHour = resource.workingHours.find((h) => h.dayOfWeek === dayOfWeek && h.isActive);

    const timeoffs = await this.prisma.resourceTimeOff.findMany({
      where: {
        resourceId: id,
        startAt: { lte: new Date(`${date}T23:59:59`) },
        endAt: { gte: new Date(`${date}T00:00:00`) },
      },
    });

    const appointments = await this.prisma.appointment.findMany({
      where: {
        resourceId: id,
        startAt: { gte: new Date(`${date}T00:00:00`) },
        endAt: { lte: new Date(`${date}T23:59:59`) },
        status: { notIn: ['cancelled', 'no_show'] },
      },
    });

    return {
      date,
      workingHour,
      timeoffs,
      appointments,
      isAvailable: !!workingHour && timeoffs.length === 0,
    };
  }
}
