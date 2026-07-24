import { Injectable } from '@nestjs/common';
import { Driver, DriverStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriverRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.DriverCreateInput): Promise<Driver> {
    return this.prisma.driver.create({ data });
  }

  findAll(companyId: bigint): Promise<Driver[]> {
    return this.prisma.driver.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { fullName: 'asc' },
    });
  }

  findById(id: bigint, companyId: bigint): Promise<Driver | null> {
    return this.prisma.driver.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  findByEmployeeNo(
    companyId: bigint,
    employeeNo: string,
  ): Promise<Driver | null> {
    return this.prisma.driver.findFirst({
      where: { companyId, employeeNo, deletedAt: null },
    });
  }

  findByLicenseNo(
    companyId: bigint,
    licenseNo: string,
  ): Promise<Driver | null> {
    return this.prisma.driver.findFirst({
      where: { companyId, licenseNo, deletedAt: null },
    });
  }

  update(id: bigint, data: Prisma.DriverUpdateInput): Promise<Driver> {
    return this.prisma.driver.update({ where: { id }, data });
  }

  softDelete(id: bigint): Promise<Driver> {
    return this.prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date(), status: DriverStatus.INACTIVE },
    });
  }

  findActiveAssignments(driverId: bigint) {
    return this.prisma.vehicleDriverAssignment.findMany({
      where: { driverId, active: true },
      include: { vehicle: true },
      orderBy: { assignedAt: 'desc' },
    });
  }

  findVehicle(id: bigint, companyId: bigint) {
    return this.prisma.vehicle.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  async assignVehicle(
    driverId: bigint,
    vehicleId: bigint,
    assignedBy: bigint,
    remarks?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.vehicleDriverAssignment.findFirst({
        where: { driverId, vehicleId, active: true },
      });
      if (existing) {
        return existing;
      }

      const releasedAt = new Date();
      await tx.vehicleDriverAssignment.updateMany({
        where: { active: true, OR: [{ driverId }, { vehicleId }] },
        data: { active: false, releasedAt },
      });

      return tx.vehicleDriverAssignment.create({
        data: { driverId, vehicleId, assignedBy, remarks },
      });
    });
  }

  async releaseVehicle(driverId: bigint, vehicleId: bigint): Promise<boolean> {
    const result = await this.prisma.vehicleDriverAssignment.updateMany({
      where: { driverId, vehicleId, active: true },
      data: { active: false, releasedAt: new Date() },
    });

    return result.count > 0;
  }
}
