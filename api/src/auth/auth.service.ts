import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;      // userId
  email: string;
  tenantId: string;
  branchId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    // หา user จาก email
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        tenant: { slug: dto.tenantSlug },
        isActive: true,
      },
      include: {
        tenant: true,
        branch: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // ตรวจสอบ password
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn(`Login failed for ${dto.email} from ${ipAddress}`);
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      branchId: user.branchId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_TTL', '30d'),
      }),
    ]);

    // บันทึก refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    this.logger.log(`Login success: ${user.email} (${user.tenantId})`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        branchId: user.branchId,
      },
    };
  }

  async refresh(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      // ตรวจสอบ token ในฐานข้อมูล
      const stored = await this.prisma.refreshToken.findFirst({
        where: { token, userId: payload.sub },
      });

      if (!stored || stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Token หมดอายุ');
      }

      const newAccessToken = await this.jwt.signAsync({
        sub: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        branchId: payload.branchId,
      });

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Token ไม่ถูกต้อง');
    }
  }

  async logout(userId: string, token: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}
