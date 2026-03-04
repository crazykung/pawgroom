import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { PetsModule } from './pets/pets.module';
import { ServicesModule } from './services/services.module';
import { ResourcesModule } from './resources/resources.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { QueueModule } from './queue/queue.module';
import { JobOrdersModule } from './job-orders/job-orders.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CompensationModule } from './compensation/compensation.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { MediaModule } from './media/media.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // ── BullMQ (Job Queue) ───────────────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'redis'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),

    // ── App Modules ──────────────────────────────────────────────────────────
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    PetsModule,
    ServicesModule,
    ResourcesModule,
    AppointmentsModule,
    QueueModule,
    JobOrdersModule,
    InvoicesModule,
    CompensationModule,
    ReportsModule,
    SettingsModule,
    MediaModule,
  ],
})
export class AppModule {}
