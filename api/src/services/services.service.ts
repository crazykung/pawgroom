import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { PriceQuoteDto } from './dto/price-quote.dto';
import { PetSizeTier, PetSpecies } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.service.findMany({
      where: { branchId, isActive: true },
      include: { priceRules: { where: { isActive: true }, orderBy: { priority: 'desc' } } },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findOne(id: string, branchId: string) {
    const svc = await this.prisma.service.findFirst({
      where: { id, branchId },
      include: { priceRules: { where: { isActive: true } } },
    });
    if (!svc) throw new NotFoundException(`Service ${id} not found`);
    return svc;
  }

  async create(branchId: string, dto: CreateServiceDto) {
    const { priceRules, ...svcData } = dto;
    return this.prisma.$transaction(async (tx) => {
      const service = await tx.service.create({ data: { ...svcData, branchId } });
      if (priceRules?.length) {
        await tx.priceRule.createMany({
          data: priceRules.map((r) => ({ ...r, serviceId: service.id })),
        });
      }
      return service;
    });
  }

  async update(id: string, branchId: string, dto: Partial<CreateServiceDto>) {
    await this.findOne(id, branchId);
    const { priceRules, ...updateData } = dto;
    return this.prisma.service.update({ where: { id }, data: updateData });
  }

  async deactivate(id: string, branchId: string) {
    await this.findOne(id, branchId);
    return this.prisma.service.update({ where: { id }, data: { isActive: false } });
  }

  async getPriceQuote(branchId: string, dto: PriceQuoteDto) {
    const { serviceIds, sizeTier, species, weightKg } = dto;
    const results: Array<{ serviceId: string; price: number; duration: number; ruleName?: string }> = [];

    for (const serviceId of serviceIds) {
      const svc = await this.prisma.service.findFirst({
        where: { id: serviceId, branchId, isActive: true },
        include: {
          priceRules: {
            where: { isActive: true },
            orderBy: { priority: 'desc' },
          },
        },
      });
      if (!svc) continue;

      // หา price rule ที่ match
      let matchedRule = svc.priceRules.find((r) => {
        const sizeMatch = !r.sizeTier || r.sizeTier === sizeTier;
        const speciesMatch = !r.species || r.species === species;
        const weightMin = r.weightMin ? parseFloat(r.weightMin.toString()) : null;
        const weightMax = r.weightMax ? parseFloat(r.weightMax.toString()) : null;
        const weightMatch = !weightKg || (
          (!weightMin || weightKg >= weightMin) &&
          (!weightMax || weightKg <= weightMax)
        );
        return sizeMatch && speciesMatch && weightMatch;
      });

      if (!matchedRule) {
        matchedRule = svc.priceRules[0]; // fallback to first rule
      }

      if (matchedRule) {
        const price = parseFloat(matchedRule.basePrice.toString());
        const duration = Math.round(svc.baseDurationMin * parseFloat(matchedRule.durationMultiplier.toString()));
        results.push({ serviceId, price, duration });
      }
    }

    return {
      items: results,
      subtotal: results.reduce((sum, r) => sum + r.price, 0),
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    };
  }
}
