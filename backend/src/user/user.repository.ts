import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base/base.repository';
import { UserStatus } from '@prisma/client';

@Injectable()
export class UserRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: bigint) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: {
        username,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email },
    });
  }

  async create(data: {
    uuid: string;
    companyId: bigint;
    username: string;
    email?: string;
    passwordHash: string;
    fullName?: string;
    phone?: string;
    status?: UserStatus;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async updateLastLogin(id: bigint) {
    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  async findAll(companyId: bigint) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        uuid: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: {
        username: 'asc',
      },
    });
  }

  async updatePassword(id: bigint, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }
}
