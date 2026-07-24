import { Module } from '@nestjs/common';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VehicleRepository } from './repositories/vehicle.repository';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [PrismaModule, DeviceModule],
  controllers: [VehicleController],
  providers: [
    VehicleService,
    VehicleRepository,
  ],
  exports: [VehicleService],
})
export class VehicleModule {}
