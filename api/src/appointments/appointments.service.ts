import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string, date?: string, resourceId?: string) {
    const where: any = {
      branchId,
      status: { notIn: ['cancelled', 'no_show'] },
    };

    if (date) {
      where.startAt = {
        gte: new Date(`${date}T00:00:00+07:00`),
        lt: new Date(`${date}T23:59:59+07:00`),
      };
    }
    if (resourceId) where.resourceId = resourceId;

    return this.prisma.appointment.findMany({
      where,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        pet: { select: { id: true, name: true, species: true, breed: true, sizeTier: true } },
        resource: { select: { id: true, name: true } },
        items: { include: { service: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async findOne(id: string, branchId: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, branchId },
      include: {
        customer: true,
        pet: true,
        resource: true,
        items: { include: { service: { include: { priceRules: true } } } },
        jobOrder: true,
      },
    });
    if (!appt) throw new NotFoundException(`Appointment ${id} not found`);
    return appt;
  }

  async create(branchId: string, dto: CreateAppointmentDto) {
    const { items, ...apptData } = dto;
    return this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: { ...apptData, branchId },
      });
      if (items?.length) {
        await tx.appointmentItem.createMany({
          data: items.map((item) => ({ ...item, appointmentId: appt.id })),
        });
      }
      return appt;
    });
  }

  async updateStatus(id: string, branchId: string, status: AppointmentStatus, reason?: string) {
    const appt = await this.findOne(id, branchId);
    const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      pending: ['booked', 'cancelled'],
      booked: ['checked_in', 'cancelled', 'no_show'],
      checked_in: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
      no_show: ['booked'],
    };

    if (!allowedTransitions[appt.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${appt.status} to ${status}`);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status, ...(reason && { cancelReason: reason }) },
    });
  }

  async checkIn(id: string, branchId: string) {
    const appt = await this.findOne(id, branchId);
    await this.updateStatus(id, branchId, 'checked_in');

    // สร้าง job order อัตโนมัติเมื่อ check in
    if (!appt.jobOrder) {
      await this.prisma.jobOrder.create({
        data: {
          branchId,
          petId: appt.petId,
          appointmentId: appt.id,
          assignedResourceId: appt.resourceId,
          status: 'checked_in',
        },
      });
    }
    return this.findOne(id, branchId);
  }
}
