import { Test, TestingModule } from '@nestjs/testing';
import { VehicleService } from './vehicle.service';
import { VehicleRepository } from './repositories/vehicle.repository';
import { DeviceService } from '../device/device.service';

describe('VehicleService', () => {
  let service: VehicleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        {
          provide: VehicleRepository,
          useValue: {},
        },
        {
          provide: DeviceService,
          useValue: { assertAssignable: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
