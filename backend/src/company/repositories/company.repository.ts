import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';

@Injectable()
export class CompanyRepository extends BaseRepository {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async create(data: {
    uuid: string;
    code: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  }) {
    return this.prisma.company.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.company.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: bigint) {
    return this.prisma.company.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string) {
    return this.prisma.company.findUnique({
      where: { code },
    });
  }

  async update(
    id: bigint,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      website?: string;
    },
  ) {
    return this.prisma.company.update({ where: { id }, data });
  }
}
