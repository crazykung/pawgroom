import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string, search?: string) {
    const where: Prisma.CustomerWhereInput = {
      branchId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.customer.findMany({
      where,
      include: {
        pets: {
          where: { isActive: true },
          select: { id: true, name: true, species: true, breed: true, sizeTier: true },
        },
      },
      orderBy: { lastVisitAt: 'desc' },
    });
  }

  async findOne(id: string, branchId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, branchId },
      include: {
        pets: {
          where: { isActive: true },
          include: { petMedia: { take: 1, orderBy: { createdAt: 'desc' } } },
        },
      },
    });

    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async findByPhone(phone: string, tenantId: string) {
    return this.prisma.customer.findFirst({
      where: { phone, tenantId },
      include: {
        pets: { where: { isActive: true } },
      },
    });
  }

  async create(branchId: string, tenantId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        ...dto,
        branchId,
        tenantId,
      },
      include: { pets: true },
    });
  }

  async update(id: string, branchId: string, dto: UpdateCustomerDto) {
    await this.findOne(id, branchId);
    return this.prisma.customer.update({
      where: { id },
      data: dto,
    });
  }

  async addTag(id: string, branchId: string, tag: string) {
    const customer = await this.findOne(id, branchId);
    const tags = [...new Set([...customer.tags, tag])];
    return this.prisma.customer.update({
      where: { id },
      data: { tags },
    });
  }
}
