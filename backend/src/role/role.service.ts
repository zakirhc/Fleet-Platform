import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.fm_role.findMany({ orderBy: { name: 'asc' } });
  }

  async rolesForUser(userId: bigint, companyId: bigint) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundException('User not found.');
    return this.prisma.fm_user_role.findMany({
      where: { user_id: userId },
      include: { fm_role: true },
    });
  }

  async replaceUserRoles(
    userId: bigint,
    companyId: bigint,
    roleCodes: string[],
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundException('User not found.');
    const roles = await this.prisma.fm_role.findMany({
      where: { code: { in: [...new Set(roleCodes)] } },
    });
    if (roles.length !== new Set(roleCodes).size)
      throw new NotFoundException('One or more roles were not found.');
    await this.prisma.$transaction([
      this.prisma.fm_user_role.deleteMany({ where: { user_id: userId } }),
      this.prisma.fm_user_role.createMany({
        data: roles.map((role) => ({ user_id: userId, role_id: role.id })),
      }),
    ]);
    return this.rolesForUser(userId, companyId);
  }
}
