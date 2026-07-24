import {
  Controller,
  Get,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Get('live')
  live() {
    return {
      application: 'Fleet Platform',
      status: 'UP',
      uptime: process.uptime(),
    };
  }

  @Get()
  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      application: 'Fleet Platform',
      status: 'UP',
      database: 'CONNECTED',
      version: '1.0.0',
      uptime: process.uptime(),
    };
  }
}
