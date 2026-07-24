import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { tc_devices } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceRepository } from './repositories/device.repository';

@Injectable()
export class DeviceService {
  constructor(
    private readonly repository: DeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(companyId: bigint) {
    return this.visibleDevices(companyId, this.repository.findAll());
  }

  async search(companyId: bigint, keyword: string) {
    return this.visibleDevices(companyId, this.repository.search(keyword));
  }

  async findOne(id: number, companyId: bigint) {
    const device = await this.repository.findById(id);
    if (!device) throw new NotFoundException('Device not found');
    const visible = await this.visibleDevices(companyId, Promise.resolve([device]));
    if (!visible.length) throw new NotFoundException('Device not found');
    return visible[0];
  }

  private async visibleDevices(
    companyId: bigint,
    devicesPromise: Promise<tc_devices[]>,
  ) {
    const [devices, assignments] = await Promise.all([
      devicesPromise,
      this.prisma.fm_vehicle_device.findMany({
        include: {
          fm_vehicle: {
            select: {
              id: true,
              companyId: true,
              registrationNo: true,
              deletedAt: true,
            },
          },
        },
      }),
    ]);
    const byDeviceId = new Map(
      assignments
        .filter((assignment) => assignment.fm_vehicle.deletedAt === null)
        .map((assignment) => [assignment.tc_device_id, assignment]),
    );
    return devices
      .filter((device) => {
        const assignment = byDeviceId.get(BigInt(device.id));
        return !assignment || assignment.fm_vehicle.companyId === companyId;
      })
      .map((device) => {
        const assignment = byDeviceId.get(BigInt(device.id));
        return {
          ...device,
          assignedVehicle: assignment
            ? {
                id: assignment.fm_vehicle.id,
                registrationNo: assignment.fm_vehicle.registrationNo,
              }
            : null,
        };
      });
  }

  async assertAssignable(
    id: bigint,
    companyId: bigint,
    vehicleId?: bigint,
  ) {
    const device = await this.repository.findById(Number(id));
    if (!device) throw new NotFoundException('Traccar device not found.');
    const assignment = await this.prisma.fm_vehicle_device.findUnique({
      where: { tc_device_id: id },
      include: { fm_vehicle: true },
    });
    if (assignment && assignment.vehicle_id !== vehicleId) {
      throw new BadRequestException('Device already assigned.');
    }
    if (assignment && assignment.fm_vehicle.companyId !== companyId) {
      throw new BadRequestException('Device belongs to another company.');
    }
    return device;
  }
}
