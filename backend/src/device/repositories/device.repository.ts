import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Replace tcDevice with your actual generated delegate name.
  private get devices() {
    return this.prisma.tc_devices;
  }

  async findAll() {
    return this.devices.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return this.devices.findUnique({
      where: { id },
    });
  }

  async search(keyword: string) {
    return this.devices.findMany({
      where: {
        OR: [
          {
            name: {
              contains: keyword,
            },
          },
          {
            uniqueid: {
              contains: keyword,
            },
          },
        ],
      },
      take: 20,
      orderBy: {
        name: 'asc',
      },
    });
  }
}