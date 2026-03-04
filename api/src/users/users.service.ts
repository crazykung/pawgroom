import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async findAll(tenantId: string, branchId?: string) {
    return this.prisma.user.findMany({
      where: { tenantId, ...(branchId && { branchId }), isActive: true },
      include: {
        userRoles: { include: { role: true } },
        resource: { select: { id: true, name: true, type: true } },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        resource: true,
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(tenantId: string, branchId: string, dto: CreateUserDto) {
    // ตรวจสอบ email ซ้ำ
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });
    if (existing) throw new ConflictException('Email นี้ถูกใช้งานแล้ว');

    const passwordHash = await this.authService.hashPassword(dto.password);
    const { password, roleId, ...userData } = dto;

    const user = await this.prisma.user.create({
      data: { ...userData, tenantId, branchId, passwordHash },
    });

    // กำหนด role ถ้ามี
    if (roleId) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId, branchId, scope: 'branch' },
      });
    }

    return user;
  }

  async update(id: string, tenantId: string, dto: UpdateUserDto) {
    await this.findOne(id, tenantId);
    const { password, roleId, ...updateData } = dto;
    const data: any = { ...updateData };
    if (password) {
      data.passwordHash = await this.authService.hashPassword(password);
    }
    return this.prisma.user.update({ where: { id }, data });
  }

  async deactivate(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }

  async getPermissions(id: string, tenantId: string): Promise<string[]> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: {
        userRoles: {
          include: {
            role: { include: { rolePermissions: { include: { permission: true } } } },
          },
        },
        permissionOverrides: { include: { permission: true } },
      },
    });
    if (!user) return [];

    const perms = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        perms.add(rp.permission.code);
      }
    }
    for (const ov of user.permissionOverrides) {
      if (ov.mode === 'grant') perms.add(ov.permission.code);
      if (ov.mode === 'deny') perms.delete(ov.permission.code);
    }
    return [...perms];
  }
}
