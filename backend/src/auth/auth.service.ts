import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtService } from '@nestjs/jwt';

import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

import { UserRepository } from '../user/user.repository';

import { LoginDto } from './dto/login.dto';

import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByUsername(dto.username);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Your account is not active.');
    }

    const verified = await argon2.verify(user.passwordHash, dto.password);

    if (!verified) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    await this.users.updateLastLogin(user.id);

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.authSession.findUnique({ where: { id: payload.sessionId }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') throw new UnauthorizedException('Refresh session is no longer valid.');
    if (!(await argon2.verify(session.refreshTokenHash, refreshToken))) throw new UnauthorizedException('Refresh token is invalid.');
    await this.prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date(), lastUsedAt: new Date() } });
    return this.issueTokens(session.user);
  }

  async logout(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    await this.prisma.authSession.updateMany({ where: { id: payload.sessionId, userId: BigInt(payload.sub), revokedAt: null }, data: { revokedAt: new Date() } });
    return { loggedOut: true };
  }

  private async issueTokens(user: { id: bigint; companyId: bigint; username: string }) {
    const base = { sub: Number(user.id), companyId: Number(user.companyId), username: user.username };
    const accessToken = await this.jwtService.signAsync({ ...base, tokenType: 'access' } satisfies JwtPayload);
    const sessionId = randomUUID();
    const refreshToken = await this.jwtService.signAsync({ ...base, tokenType: 'refresh', sessionId } satisfies JwtPayload, { secret: this.refreshSecret(), expiresIn: this.refreshExpiresIn() as never });
    const expiresAt = new Date(Date.now() + this.durationMilliseconds(this.refreshExpiresIn()));
    await this.prisma.authSession.create({ data: { id: sessionId, userId: user.id, refreshTokenHash: await argon2.hash(refreshToken), expiresAt } });
    return { accessToken, expiresIn: 900, refreshToken, refreshExpiresIn: this.refreshExpiresIn() };
  }

  private async verifyRefreshToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret: this.refreshSecret() });
      if (payload.tokenType !== 'refresh' || !payload.sessionId) throw new UnauthorizedException('Invalid refresh token.');
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
  }

  private refreshSecret() { return this.config.get<string>('JWT_REFRESH_SECRET') ?? this.config.getOrThrow<string>('JWT_SECRET'); }
  private refreshExpiresIn() { return this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d'; }
  private durationMilliseconds(value: string) { const match = /^(\d+)([smhd])$/.exec(value); if (!match) throw new Error('JWT_REFRESH_EXPIRES_IN must use a number followed by s, m, h, or d.'); const amount = Number(match[1]); return amount * ({ s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const)[match[2] as 's' | 'm' | 'h' | 'd']; }

  async bootstrapAdmin(username: string, bootstrapSecret: string) {
    const configured = this.config.get<string>('BOOTSTRAP_ADMIN_SECRET');
    if (!configured || configured !== bootstrapSecret)
      throw new UnauthorizedException('Invalid bootstrap secret.');
    const user = await this.users.findByUsername(username);
    if (!user) throw new UnauthorizedException('User not found.');
    const existing = await this.prisma.fm_user_role.findFirst({
      where: { fm_role: { code: { in: ['SUPER_ADMIN', 'COMPANY_ADMIN'] } } },
    });
    if (existing)
      throw new ConflictException(
        'An administrator role has already been bootstrapped.',
      );
    const role = await this.prisma.fm_role.findUnique({
      where: { code: 'COMPANY_ADMIN' },
    });
    if (!role) throw new ConflictException('COMPANY_ADMIN role is missing.');
    await this.prisma.fm_user_role.create({
      data: { user_id: user.id, role_id: role.id },
    });
    return { userId: user.id, role: role.code };
  }
}
