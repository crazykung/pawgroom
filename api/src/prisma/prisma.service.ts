import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDb() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDb is not allowed in production');
    }
    // Order matters due to foreign keys
    await this.$transaction([
      this.compAdjustment.deleteMany(),
      this.compTransaction.deleteMany(),
      this.compPeriod.deleteMany(),
      this.compRule.deleteMany(),
      this.compPlanAssignment.deleteMany(),
      this.compPlan.deleteMany(),
      this.payment.deleteMany(),
      this.creditNote.deleteMany(),
      this.invoiceLine.deleteMany(),
      this.invoice.deleteMany(),
      this.jobGroomerSplit.deleteMany(),
      this.jobItem.deleteMany(),
      this.jobOrder.deleteMany(),
      this.queueTicket.deleteMany(),
      this.appointmentItem.deleteMany(),
      this.appointment.deleteMany(),
      this.priceRule.deleteMany(),
      this.service.deleteMany(),
      this.resourceTimeOff.deleteMany(),
      this.resourceWorkingHours.deleteMany(),
      this.resource.deleteMany(),
      this.petMedia.deleteMany(),
      this.pet.deleteMany(),
      this.customer.deleteMany(),
    ]);
  }
}
