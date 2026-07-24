import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest().user as { sub?: number };
    if (!user?.sub) throw new ForbiddenException('A role is required.');
    const assignments = await this.prisma.fm_user_role.findMany({
      where: { user_id: BigInt(user.sub) },
      include: { fm_role: true },
    });
    if (
      !assignments.some((assignment) =>
        required.includes(assignment.fm_role.code),
      )
    )
      throw new ForbiddenException(
        'You do not have permission for this action.',
      );
    return true;
  }
}
