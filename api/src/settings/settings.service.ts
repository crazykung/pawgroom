import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

const SETTINGS_CACHE_PREFIX = 'settings:';
const SETTINGS_TTL = 300; // 5 minutes

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async get(tenantId: string, key: string): Promise<any> {
    const cacheKey = `${SETTINGS_CACHE_PREFIX}${tenantId}:${key}`;
    const cached = await this.cache.get(cacheKey);
    if (cached !== undefined && cached !== null) return cached;

    const setting = await this.prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });

    const value = setting?.value ?? null;
    await this.cache.set(cacheKey, value, SETTINGS_TTL);
    return value;
  }

  async getAll(tenantId: string): Promise<Record<string, any>> {
    const settings = await this.prisma.setting.findMany({
      where: { tenantId },
    });
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  async set(tenantId: string, key: string, value: any): Promise<void> {
    await this.prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key } },
      create: { tenantId, key, value },
      update: { value },
    });
    // Invalidate cache
    await this.cache.del(`${SETTINGS_CACHE_PREFIX}${tenantId}:${key}`);
  }

  async bulkSet(tenantId: string, settings: Record<string, any>): Promise<void> {
    await this.prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { tenantId_key: { tenantId, key } },
          create: { tenantId, key, value },
          update: { value },
        }),
      ),
    );
    // Invalidate all tenant settings cache
    const keys = Object.keys(settings);
    await Promise.all(
      keys.map((k) =>
        this.cache.del(`${SETTINGS_CACHE_PREFIX}${tenantId}:${k}`),
      ),
    );
  }

  async delete(tenantId: string, key: string): Promise<void> {
    await this.prisma.setting.deleteMany({ where: { tenantId, key } });
    await this.cache.del(`${SETTINGS_CACHE_PREFIX}${tenantId}:${key}`);
  }
}
