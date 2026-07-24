import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { DeviceRepository } from './repositories/device.repository';

@Module({
  imports: [PrismaModule],
  controllers: [DeviceController],
  providers: [
    DeviceService,
    DeviceRepository,
  ],
  exports: [DeviceService],
})
export class DeviceModule {}