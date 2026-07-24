import { PrismaService } from '../../prisma/prisma.service';

export abstract class BaseRepository {
  protected constructor(
    protected readonly prisma: PrismaService,
  ) {}

  protected getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  protected getTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }
}