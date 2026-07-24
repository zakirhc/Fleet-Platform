import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DriverStatus } from '@prisma/client';

import { DriverRepository } from './driver.repository';
import { DriverService } from './driver.service';

describe('DriverService', () => {
  const companyId = 1n;
  const driver = {
    id: 2n,
    companyId,
    employeeNo: 'EMP-001',
    licenseNo: 'LIC-001',
    deletedAt: null,
  } as never;

  let repository: jest.Mocked<DriverRepository>;
  let service: DriverService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmployeeNo: jest.fn(),
      findByLicenseNo: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findActiveAssignments: jest.fn(),
      findVehicle: jest.fn(),
      assignVehicle: jest.fn(),
      releaseVehicle: jest.fn(),
    } as unknown as jest.Mocked<DriverRepository>;
    service = new DriverService(repository);
  });

  it('creates a driver after confirming employee and licence uniqueness', async () => {
    repository.findByEmployeeNo.mockResolvedValue(null);
    repository.findByLicenseNo.mockResolvedValue(null);
    repository.create.mockResolvedValue(driver);

    await expect(
      service.create(companyId, {
        fullName: 'Amina Rahman',
        employeeNo: 'EMP-001',
      }),
    ).resolves.toEqual(driver);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company: { connect: { id: companyId } },
        fullName: 'Amina Rahman',
        employeeNo: 'EMP-001',
      }),
    );
  });

  it('rejects a duplicate employee number within the same company', async () => {
    repository.findByEmployeeNo.mockResolvedValue(driver);

    await expect(
      service.create(companyId, {
        fullName: 'Amina Rahman',
        employeeNo: 'EMP-001',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('does not expose a driver from another company', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(2n, companyId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('soft-deletes an existing driver', async () => {
    repository.findById.mockResolvedValue(driver);
    repository.softDelete.mockResolvedValue({
      ...driver,
      status: DriverStatus.INACTIVE,
    } as never);

    await service.remove(2n, companyId);

    expect(repository.softDelete).toHaveBeenCalledWith(2n);
  });

  it('assigns a company vehicle to an existing driver', async () => {
    repository.findById.mockResolvedValue(driver);
    repository.findVehicle.mockResolvedValue({ id: 9n } as never);
    repository.assignVehicle.mockResolvedValue({ id: 12n } as never);

    await expect(
      service.assignVehicle(2n, 9n, companyId, 7n, 'Morning shift'),
    ).resolves.toEqual({
      id: 12n,
    });
    expect(repository.assignVehicle).toHaveBeenCalledWith(
      2n,
      9n,
      7n,
      'Morning shift',
    );
  });
});
