import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { VehicleRepository } from './repositories/vehicle.repository';

import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Prisma } from '@prisma/client';
import { Vehicle } from '@prisma/client';
import { DeviceService } from '../device/device.service';

@Injectable()
export class VehicleService {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly devices: DeviceService,
  ) {}

  async create(companyId: bigint, dto: CreateVehicleDto) {
    const existing = await this.vehicleRepository.findByRegistration(
      companyId,
      dto.registrationNo,
    );

    if (existing) {
      throw new BadRequestException('Registration number already exists.');
    }

    if (dto.traccarDeviceId)
      await this.devices.assertAssignable(
        BigInt(dto.traccarDeviceId),
        companyId,
      );

    const vehicle = await this.vehicleRepository.create({
      company: {
        connect: {
          id: companyId,
        },
      },

      registrationNo: dto.registrationNo,

      fleetNo: dto.fleetNo,

      traccarDeviceId: dto.traccarDeviceId ? BigInt(dto.traccarDeviceId) : null,

      make: dto.make,

      model: dto.model,

      year: dto.year,

      chassisNo: dto.chassisNo,

      engineNo: dto.engineNo,

      color: dto.color,

      fuelType: dto.fuelType,

      remarks: dto.remarks,
    });
    return dto.traccarDeviceId
      ? this.vehicleRepository.assignDevice(
          vehicle.id,
          BigInt(dto.traccarDeviceId),
        )
      : vehicle;
  }

  async findAll(companyId: bigint) {
    return this.vehicleRepository.findAll(companyId);
  }

  async findOne(id: bigint, companyId: bigint) {
    const vehicle = await this.vehicleRepository.findById(id, companyId);

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    return vehicle;
  }

  async update(id: bigint, companyId: bigint, dto: UpdateVehicleDto) {
    const vehicle = await this.vehicleRepository.findById(id, companyId);

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    if (dto.registrationNo) {
      const existing = await this.vehicleRepository.findByRegistration(
        vehicle.companyId,
        dto.registrationNo,
      );

      if (existing && existing.id !== id) {
        throw new BadRequestException('Registration number already exists.');
      }
    }

    if (dto.traccarDeviceId)
      await this.devices.assertAssignable(
        BigInt(dto.traccarDeviceId),
        companyId,
        id,
      );

    const data: Prisma.VehicleUpdateInput = {};

    if (dto.registrationNo !== undefined)
      data.registrationNo = dto.registrationNo;

    if (dto.fleetNo !== undefined) data.fleetNo = dto.fleetNo;

    if (dto.make !== undefined) data.make = dto.make;

    if (dto.model !== undefined) data.model = dto.model;

    if (dto.year !== undefined) data.year = dto.year;

    if (dto.chassisNo !== undefined) data.chassisNo = dto.chassisNo;

    if (dto.engineNo !== undefined) data.engineNo = dto.engineNo;

    if (dto.color !== undefined) data.color = dto.color;

    if (dto.fuelType !== undefined) data.fuelType = dto.fuelType;

    if (dto.remarks !== undefined) data.remarks = dto.remarks;

    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.vehicleRepository.update(id, data);
    if (dto.traccarDeviceId === undefined) return updated;
    return dto.traccarDeviceId === null
      ? this.vehicleRepository.unassignDevice(id)
      : this.vehicleRepository.assignDevice(id, BigInt(dto.traccarDeviceId));
  }

  async remove(id: bigint, companyId: bigint) {
    await this.findOne(id, companyId);
    return this.vehicleRepository.softDelete(id);
  }

  async assignDevice(id: bigint, companyId: bigint, deviceId: bigint) {
    await this.findOne(id, companyId);
    await this.devices.assertAssignable(deviceId, companyId, id);
    return this.vehicleRepository.assignDevice(id, deviceId);
  }

  async unassignDevice(id: bigint, companyId: bigint) {
    await this.findOne(id, companyId);
    return this.vehicleRepository.unassignDevice(id);
  }
}
