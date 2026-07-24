import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtService } from '@nestjs/jwt';

import * as argon2 from 'argon2';

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

    const payload: JwtPayload = {
      sub: Number(user.id),
      companyId: Number(user.companyId),
      username: user.username,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      expiresIn: 900,
    };
  }

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
