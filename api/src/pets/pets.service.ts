import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(private prisma: PrismaService) {}

  async findByCustomer(customerId: string, branchId: string) {
    return this.prisma.pet.findMany({
      where: { customerId, branchId, isActive: true },
      include: {
        petMedia: { take: 3, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, branchId: string) {
    const pet = await this.prisma.pet.findFirst({
      where: { id, branchId, isActive: true },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        petMedia: { take: 10, orderBy: { createdAt: 'desc' } },
        jobOrders: {
          where: { status: 'completed' },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { service: true } } },
        },
      },
    });
    if (!pet) throw new NotFoundException(`Pet ${id} not found`);
    return pet;
  }

  async create(customerId: string, branchId: string, dto: CreatePetDto) {
    return this.prisma.pet.create({
      data: { ...dto, customerId, branchId },
    });
  }

  async update(id: string, branchId: string, dto: UpdatePetDto) {
    await this.findOne(id, branchId);
    return this.prisma.pet.update({ where: { id }, data: dto });
  }

  async deactivate(id: string, branchId: string) {
    await this.findOne(id, branchId);
    return this.prisma.pet.update({ where: { id }, data: { isActive: false } });
  }

  async getGroomingHistory(id: string, branchId: string) {
    await this.findOne(id, branchId);
    return this.prisma.jobOrder.findMany({
      where: { petId: id, status: 'completed' },
      include: {
        items: { include: { service: true } },
        invoices: { include: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
