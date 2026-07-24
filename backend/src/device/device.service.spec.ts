import { Test, TestingModule } from '@nestjs/testing';
import { DeviceService } from './device.service';
import { DeviceRepository } from './repositories/device.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('DeviceService', () => {
  let service: DeviceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        {
          provide: DeviceRepository,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: { fm_vehicle_device: {} },
        },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
