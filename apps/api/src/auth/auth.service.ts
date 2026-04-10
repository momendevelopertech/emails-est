import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { addDays } from 'date-fns';
import { createHmac, randomUUID } from 'crypto';
import { getJwtKeys } from './jwt-keys';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  private serializeUser(user: {
    id: string;
    email: string;
    username?: string | null;
    fullName: string;
    role: string;
    phone?: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username ?? undefined,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone ?? null,
    };
  }

  private getRefreshTokenSecret() {
    return process.env.REFRESH_TOKEN_SECRET || process.env.JWT_PRIVATE_KEY || process.env.CSRF_SECRET || 'dev-refresh-secret';
  }

  private hashToken(token: string) {
    return createHmac('sha256', this.getRefreshTokenSecret()).update(`refresh:${token}`).digest('hex');
  }

  async login(identifier: string, password: string, rememberMe = false) {
    const normalized = identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: normalized }, { username: normalized }] },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email, user.role, rememberMe ? 30 : 7);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.serializeUser(user),
    };
  }

  async logout(userId?: string, refreshToken?: string) {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { token: this.hashToken(refreshToken), ...(userId ? { userId } : {}) },
      data: { isRevoked: true },
    });
  }

  async refreshTokens(refreshToken: string | undefined, rememberMe = false) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const existing = await this.prisma.refreshToken.findUnique({ where: { token: this.hashToken(refreshToken) } });
    if (!existing || existing.isRevoked || existing.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findUnique({ where: { id: existing.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.refreshToken.update({ where: { token: existing.token }, data: { isRevoked: true } });
    return this.generateTokens(user.id, user.email, user.role, rememberMe ? 30 : 7);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid current password');
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
  }

  private async generateTokens(userId: string, email: string, role: string, refreshDays: number) {
    const keys = getJwtKeys();
    const accessToken = await this.jwtService.signAsync({ sub: userId, email, role }, {
      privateKey: keys.privateKey,
      algorithm: 'RS256',
      expiresIn: '15m',
    });
    const rawRefresh = randomUUID();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: this.hashToken(rawRefresh),
        expiresAt: addDays(new Date(), refreshDays),
      },
    });
    return { accessToken, refreshToken: rawRefresh };
  }
}
