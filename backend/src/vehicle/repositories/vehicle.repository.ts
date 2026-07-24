import { Injectable } from '@nestjs/common';
import { Prisma, Vehicle, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.VehicleCreateInput): Promise<Vehicle> {
    return this.prisma.vehicle.create({
      data,
    });
  }

  async findAll(companyId: bigint): Promise<Vehicle[]> {
    return this.prisma.vehicle.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        registrationNo: 'asc',
      },
    });
  }
  async findById(id: bigint, companyId: bigint): Promise<Vehicle | null> {
    return this.prisma.vehicle.findUnique({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });
  }

  async findByRegistration(
    companyId: bigint,
    registrationNo: string,
  ): Promise<Vehicle | null> {
    return this.prisma.vehicle.findFirst({
      where: {
        companyId,
        registrationNo,
        deletedAt: null,
      },
    });
  }

  async findByDevice(traccarDeviceId: bigint): Promise<Vehicle | null> {
    return this.prisma.vehicle.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { traccarDeviceId },
          { deviceLink: { is: { tc_device_id: traccarDeviceId } } },
        ],
      },
    });
  }

  async update(id: bigint, data: Prisma.VehicleUpdateInput): Promise<Vehicle> {
    return this.prisma.vehicle.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: bigint): Promise<Vehicle> {
    return this.prisma.$transaction(async (tx) => {
      await tx.fm_vehicle_device.deleteMany({ where: { vehicle_id: id } });
      return tx.vehicle.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: VehicleStatus.INACTIVE,
          traccarDeviceId: null,
        },
      });
    });
  }

  async assignDevice(id: bigint, deviceId: bigint): Promise<Vehicle> {
    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.update({
        where: { id },
        data: { traccarDeviceId: deviceId },
      });
      await tx.fm_vehicle_device.upsert({
        where: { vehicle_id: id },
        create: { vehicle_id: id, tc_device_id: deviceId },
        update: { tc_device_id: deviceId, assigned_at: new Date() },
      });
      return vehicle;
    });
  }

  async unassignDevice(id: bigint): Promise<Vehicle> {
    return this.prisma.$transaction(async (tx) => {
      await tx.fm_vehicle_device.deleteMany({ where: { vehicle_id: id } });
      return tx.vehicle.update({
        where: { id },
        data: { traccarDeviceId: null },
      });
    });
  }
}
