import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { DriverController } from './driver.controller';
import { DriverRepository } from './driver.repository';
import { DriverService } from './driver.service';

@Module({
  imports: [PrismaModule],
  controllers: [DriverController],
  providers: [DriverRepository, DriverService],
  exports: [DriverService],
})
export class DriverModule {}
