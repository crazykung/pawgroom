import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQueueTicketDto } from './dto/create-queue-ticket.dto';
import { QueueStatus } from '@prisma/client';

@Injectable()
export class QueueService {
  constructor(private prisma: PrismaService) {}

  async findToday(branchId: string, status?: QueueStatus) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return this.prisma.queueTicket.findMany({
      where: {
        branchId,
        createdAt: { gte: start, lte: end },
        ...(status && { status }),
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        jobOrder: {
          include: {
            pet: { select: { id: true, name: true, species: true, breed: true, sizeTier: true } },
            items: { include: { service: { select: { id: true, name: true } } } },
            resource: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string, branchId: string) {
    const ticket = await this.prisma.queueTicket.findFirst({
      where: { id, branchId },
      include: {
        customer: true,
        jobOrder: { include: { pet: true, items: { include: { service: true } } } },
      },
    });
    if (!ticket) throw new NotFoundException(`Queue ticket ${id} not found`);
    return ticket;
  }

  async create(branchId: string, dto: CreateQueueTicketDto) {
    // สร้าง ticket number อัตโนมัติ
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const count = await this.prisma.queueTicket.count({
      where: { branchId, createdAt: { gte: startOfDay } },
    });
    const ticketNo = `#${String(count + 101).padStart(3, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.queueTicket.create({
        data: {
          branchId,
          customerId: dto.customerId,
          ticketNo,
          notes: dto.notes,
          checkedInAt: new Date(),
        },
      });

      // สร้าง job order พร้อมกัน
      if (dto.petId && dto.serviceIds?.length) {
        const jobOrder = await tx.jobOrder.create({
          data: {
            branchId,
            petId: dto.petId,
            queueTicketId: ticket.id,
            assignedResourceId: dto.resourceId,
            status: 'checked_in',
          },
        });

        // เพิ่ม job items (ราคาจาก price rule)
        for (const svcId of dto.serviceIds) {
          await tx.jobItem.create({
            data: {
              jobOrderId: jobOrder.id,
              serviceId: svcId,
              appliedPrice: dto.priceOverrides?.[svcId] ?? 0,
              appliedDuration: 60,
            },
          });
        }
      }

      return tx.queueTicket.findFirst({
        where: { id: ticket.id },
        include: { jobOrder: { include: { pet: true } } },
      });
    });
  }

  async updateStatus(id: string, branchId: string, status: QueueStatus) {
    const ticket = await this.findOne(id, branchId);
    const allowed: Record<QueueStatus, QueueStatus[]> = {
      waiting: ['in_progress', 'cancelled'],
      in_progress: ['ready', 'cancelled'],
      ready: ['completed', 'in_progress'],
      completed: [],
      cancelled: [],
    };
    if (!allowed[ticket.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition ${ticket.status} → ${status}`);
    }
    const data: any = { status };
    if (status === 'in_progress') data.calledAt = new Date();
    if (status === 'completed') data.completedAt = new Date();

    return this.prisma.queueTicket.update({ where: { id }, data });
  }

  async getStats(branchId: string) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [waiting, in_progress, ready, completed] = await Promise.all([
      this.prisma.queueTicket.count({ where: { branchId, status: 'waiting', createdAt: { gte: start } } }),
      this.prisma.queueTicket.count({ where: { branchId, status: 'in_progress', createdAt: { gte: start } } }),
      this.prisma.queueTicket.count({ where: { branchId, status: 'ready', createdAt: { gte: start } } }),
      this.prisma.queueTicket.count({ where: { branchId, status: 'completed', createdAt: { gte: start } } }),
    ]);

    return { waiting, in_progress, ready, completed, total: waiting + in_progress + ready + completed };
  }
}
