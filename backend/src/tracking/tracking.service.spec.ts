import { PrismaService } from '../prisma/prisma.service';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';

describe('TrackingService', () => {
  const prisma = {
    vehicle: { findMany: jest.fn(), findFirst: jest.fn() },
    tc_positions: { findFirst: jest.fn(), findMany: jest.fn() },
  } as unknown as jest.Mocked<PrismaService>;
  const gateway = {
    broadcastPosition: jest.fn(),
  } as unknown as jest.Mocked<TrackingGateway>;
  let service: TrackingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TrackingService(prisma, gateway);
  });

  it('returns only the requesting company’s vehicle positions', async () => {
    prisma.vehicle.findMany.mockResolvedValue([
      {
        id: 1n,
        companyId: 7n,
        registrationNo: 'DHA-11-1234',
        traccarDeviceId: 11n,
      },
    ] as never);
    prisma.tc_positions.findFirst.mockResolvedValue({
      id: 55,
      deviceid: 11,
      latitude: 23.81,
      longitude: 90.41,
      speed: 18,
      course: 90,
      fixtime: new Date('2026-07-19T10:00:00.000Z'),
      attributes: '{"ignition":true}',
    } as never);

    await expect(service.findLatestByCompany(7n)).resolves.toEqual([
      expect.objectContaining({
        vehicleId: 1n,
        traccarDeviceId: 11n,
        position: expect.objectContaining({ positionId: '55', deviceId: '11' }),
      }),
    ]);
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 7n }),
      }),
    );
  });

  it('broadcasts each newly observed position only once', async () => {
    prisma.vehicle.findMany.mockResolvedValue([
      {
        id: 1n,
        companyId: 7n,
        registrationNo: 'DHA-11-1234',
        traccarDeviceId: 11n,
      },
    ] as never);
    prisma.tc_positions.findFirst.mockResolvedValue({
      id: 55,
      deviceid: 11,
      latitude: 23.81,
      longitude: 90.41,
      speed: 18,
      course: 90,
      fixtime: new Date('2026-07-19T10:00:00.000Z'),
      attributes: null,
    } as never);

    await service.publishLatestPositions();
    await service.publishLatestPositions();

    expect(gateway.broadcastPosition).toHaveBeenCalledTimes(1);
    expect(gateway.broadcastPosition).toHaveBeenCalledWith(
      7n,
      expect.objectContaining({ positionId: '55' }),
    );
  });

  it('returns ordered, company-scoped route history with summary statistics', async () => {
    prisma.vehicle.findFirst.mockResolvedValue({
      id: 1n,
      companyId: 7n,
      registrationNo: 'DHA-11-1234',
      traccarDeviceId: 11n,
      deviceLink: null,
    } as never);
    prisma.tc_positions.findMany.mockResolvedValue([
      {
        id: 100,
        latitude: 23.81,
        longitude: 90.41,
        speed: 10,
        course: 90,
        fixtime: new Date('2026-07-19T10:00:00.000Z'),
      },
      {
        id: 101,
        latitude: 23.82,
        longitude: 90.42,
        speed: 20,
        course: 95,
        fixtime: new Date('2026-07-19T10:05:00.000Z'),
      },
    ] as never);

    await expect(
      service.history(
        1n,
        7n,
        new Date('2026-07-19T00:00:00.000Z'),
        new Date('2026-07-20T00:00:00.000Z'),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        registrationNo: 'DHA-11-1234',
        summary: expect.objectContaining({
          points: 2,
          maxSpeed: 20,
          averageSpeed: 15,
        }),
        positions: [
          expect.objectContaining({ positionId: '100' }),
          expect.objectContaining({ positionId: '101' }),
        ],
      }),
    );
    expect(prisma.vehicle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 1n, companyId: 7n }),
      }),
    );
    expect(prisma.tc_positions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deviceid: 11, valid: 1 }),
        orderBy: { fixtime: 'asc' },
      }),
    );
  });
});
