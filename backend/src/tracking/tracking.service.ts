import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { PositionUpdate, TrackingGateway } from './tracking.gateway';

export type VehiclePosition = {
  vehicleId: bigint;
  registrationNo: string;
  traccarDeviceId: bigint;
  position: PositionUpdate | null;
};

export type HistoryPoint = {
  positionId: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  fixTime: string;
};

@Injectable()
export class TrackingService {
  private readonly emittedPositionIds = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  async findLatestByCompany(companyId: bigint): Promise<VehiclePosition[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { traccarDeviceId: { not: null } },
          { deviceLink: { isNot: null } },
        ],
      },
      include: { deviceLink: true },
      orderBy: { registrationNo: 'asc' },
    });

    return Promise.all(
      vehicles.map((vehicle) => this.findVehiclePosition(vehicle)),
    );
  }

  async history(
    vehicleId: bigint,
    companyId: bigint,
    from: Date,
    to: Date,
    limit = 2000,
  ) {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to)
      throw new BadRequestException('The history date range is invalid.');
    if (to.getTime() - from.getTime() > 31 * 24 * 60 * 60 * 1000)
      throw new BadRequestException('History is limited to a 31-day range.');
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId, deletedAt: null },
      include: { deviceLink: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    const deviceId = vehicle.deviceLink?.tc_device_id ?? vehicle.traccarDeviceId;
    if (deviceId === null)
      throw new BadRequestException('This vehicle has no Traccar device assigned.');
    const positions = await this.prisma.tc_positions.findMany({
      where: {
        deviceid: Number(deviceId),
        valid: 1,
        fixtime: { gte: from, lte: to },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        speed: true,
        course: true,
        fixtime: true,
      },
      orderBy: { fixtime: 'asc' },
      take: limit,
    });
    const points: HistoryPoint[] = positions.map((position) => ({
      positionId: String(position.id),
      latitude: position.latitude,
      longitude: position.longitude,
      speed: position.speed,
      course: position.course,
      fixTime: position.fixtime.toISOString(),
    }));
    const distanceKm = points.slice(1).reduce(
      (total, point, index) => total + this.distanceKm(points[index], point),
      0,
    );
    const speeds = points.map((point) => point.speed);
    return {
      vehicleId,
      registrationNo: vehicle.registrationNo,
      traccarDeviceId: deviceId,
      from: from.toISOString(),
      to: to.toISOString(),
      truncated: positions.length === limit,
      summary: {
        points: points.length,
        distanceKm: Number(distanceKm.toFixed(2)),
        maxSpeed: speeds.length ? Number(Math.max(...speeds).toFixed(1)) : 0,
        averageSpeed: speeds.length
          ? Number((speeds.reduce((total, speed) => total + speed, 0) / speeds.length).toFixed(1))
          : 0,
      },
      positions: points,
    };
  }

  @Interval(5_000)
  async publishLatestPositions(): Promise<void> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        deletedAt: null,
        OR: [
          { traccarDeviceId: { not: null } },
          { deviceLink: { isNot: null } },
        ],
      },
      include: { deviceLink: true },
    });

    await Promise.all(
      vehicles.map(async (vehicle) => {
        const vehiclePosition = await this.findVehiclePosition(vehicle);
        const { position } = vehiclePosition;
        if (!position) {
          return;
        }

        const cacheKey = vehicle.id.toString();
        const positionId = Number(position.positionId);
        if (this.emittedPositionIds.get(cacheKey) === positionId) {
          return;
        }

        this.emittedPositionIds.set(cacheKey, positionId);
        this.trackingGateway.broadcastPosition(vehicle.companyId, position);
      }),
    );
  }

  private async findVehiclePosition(vehicle: {
    id: bigint;
    companyId: bigint;
    registrationNo: string;
    traccarDeviceId: bigint | null;
    deviceLink?: { tc_device_id: bigint } | null;
  }): Promise<VehiclePosition> {
    const traccarDeviceId =
      vehicle.deviceLink?.tc_device_id ?? vehicle.traccarDeviceId;
    if (traccarDeviceId === null) {
      throw new Error('Tracking query requires a Traccar device.');
    }

    const position = await this.prisma.tc_positions.findFirst({
      where: { deviceid: Number(traccarDeviceId) },
      orderBy: { fixtime: 'desc' },
    });

    return {
      vehicleId: vehicle.id,
      registrationNo: vehicle.registrationNo,
      traccarDeviceId,
      position: position
        ? {
            deviceId: String(position.deviceid),
            positionId: String(position.id),
            latitude: position.latitude,
            longitude: position.longitude,
            speed: position.speed,
            course: position.course,
            fixTime: position.fixtime.toISOString(),
            attributes: position.attributes,
          }
        : null,
    };
  }

  private distanceKm(first: HistoryPoint, second: HistoryPoint) {
    const radiusKm = 6371;
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const deltaLatitude = toRadians(second.latitude - first.latitude);
    const deltaLongitude = toRadians(second.longitude - first.longitude);
    const a =
      Math.sin(deltaLatitude / 2) ** 2 +
      Math.cos(toRadians(first.latitude)) *
        Math.cos(toRadians(second.latitude)) *
        Math.sin(deltaLongitude / 2) ** 2;
    return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
