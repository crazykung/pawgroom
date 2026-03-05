import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  // In-memory cache (simple, avoids @nestjs/cache-manager dependency)
  private cache = new Map<string, { value: any; expiresAt: number }>();
  private readonly TTL = 300_000; // 5 min

  constructor(private prisma: PrismaService) {}

  private cacheKey(branchId: string, key: string) {
    return `${branchId}:${key}`;
  }

  private getCached(branchId: string, key: string): any {
    const entry = this.cache.get(this.cacheKey(branchId, key));
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) { this.cache.delete(this.cacheKey(branchId, key)); return undefined; }
    return entry.value;
  }

  private setCached(branchId: string, key: string, value: any) {
    this.cache.set(this.cacheKey(branchId, key), { value, expiresAt: Date.now() + this.TTL });
  }

  private delCached(branchId: string, key: string) {
    this.cache.delete(this.cacheKey(branchId, key));
  }

  async get(branchId: string, key: string): Promise<any> {
    const cached = this.getCached(branchId, key);
    if (cached !== undefined) return cached;

    const setting = await this.prisma.settingKv.findUnique({
      where: { branchId_key: { branchId, key } },
    });

    const value = setting?.value ?? null;
    this.setCached(branchId, key, value);
    return value;
  }

  async getAll(branchId: string): Promise<Record<string, any>> {
    const settings = await this.prisma.settingKv.findMany({ where: { branchId } });
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  async set(branchId: string, key: string, value: any): Promise<void> {
    await this.prisma.settingKv.upsert({
      where: { branchId_key: { branchId, key } },
      create: { branchId, key, value },
      update: { value },
    });
    this.delCached(branchId, key);
  }

  async bulkSet(branchId: string, settings: Record<string, any>): Promise<void> {
    await this.prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        this.prisma.settingKv.upsert({
          where: { branchId_key: { branchId, key } },
          create: { branchId, key, value },
          update: { value },
        }),
      ),
    );
    Object.keys(settings).forEach((k) => this.delCached(branchId, k));
  }

  async delete(branchId: string, key: string): Promise<void> {
    await this.prisma.settingKv.deleteMany({ where: { branchId, key } });
    this.delCached(branchId, key);
  }
}
