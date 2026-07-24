import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DriverStatus, Prisma } from '@prisma/client';

import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverRepository } from './driver.repository';

@Injectable()
export class DriverService {
  constructor(private readonly driverRepository: DriverRepository) {}

  async create(companyId: bigint, dto: CreateDriverDto) {
    await this.ensureUniqueFields(companyId, dto.employeeNo, dto.licenseNo);

    return this.driverRepository.create({
      company: { connect: { id: companyId } },
      employeeNo: dto.employeeNo,
      fullName: dto.fullName,
      designation: dto.designation,
      department: dto.department,
      mobile: dto.mobile,
      email: dto.email,
      licenseNo: dto.licenseNo,
      licenseType: dto.licenseType,
      licenseIssueDate: dto.licenseIssueDate,
      licenseExpiry: dto.licenseExpiry,
      nid: dto.nid,
      passportNo: dto.passportNo,
      bloodGroup: dto.bloodGroup,
      dateOfBirth: dto.dateOfBirth,
      joiningDate: dto.joiningDate,
      address: dto.address,
      emergencyName: dto.emergencyName,
      emergencyPhone: dto.emergencyPhone,
      photo: dto.photo,
      status: dto.status,
      remarks: dto.remarks,
    });
  }

  async findAll(companyId: bigint) {
    return this.driverRepository.findAll(companyId);
  }

  async findOne(id: bigint, companyId: bigint) {
    return this.getExisting(id, companyId);
  }

  async update(id: bigint, companyId: bigint, dto: UpdateDriverDto) {
    const driver = await this.getExisting(id, companyId);

    if (dto.employeeNo !== undefined || dto.licenseNo !== undefined) {
      await this.ensureUniqueFields(
        companyId,
        dto.employeeNo ?? driver.employeeNo ?? undefined,
        dto.licenseNo ?? driver.licenseNo ?? undefined,
        id,
      );
    }

    const data: Prisma.DriverUpdateInput = {};
    const fields: (keyof UpdateDriverDto)[] = [
      'employeeNo',
      'fullName',
      'designation',
      'department',
      'mobile',
      'email',
      'licenseNo',
      'licenseType',
      'licenseIssueDate',
      'licenseExpiry',
      'nid',
      'passportNo',
      'bloodGroup',
      'dateOfBirth',
      'joiningDate',
      'address',
      'emergencyName',
      'emergencyPhone',
      'photo',
      'status',
      'remarks',
    ];

    for (const field of fields) {
      if (dto[field] !== undefined) {
        Object.assign(data, { [field]: dto[field] });
      }
    }

    return this.driverRepository.update(id, data);
  }

  async remove(id: bigint, companyId: bigint) {
    await this.getExisting(id, companyId);
    return this.driverRepository.softDelete(id);
  }

  async findAssignments(id: bigint, companyId: bigint) {
    await this.getExisting(id, companyId);
    return this.driverRepository.findActiveAssignments(id);
  }

  async assignVehicle(
    driverId: bigint,
    vehicleId: bigint,
    companyId: bigint,
    assignedBy: bigint,
    remarks?: string,
  ) {
    await this.getExisting(driverId, companyId);

    const vehicle = await this.driverRepository.findVehicle(
      vehicleId,
      companyId,
    );
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    return this.driverRepository.assignVehicle(
      driverId,
      vehicleId,
      assignedBy,
      remarks,
    );
  }

  async releaseVehicle(driverId: bigint, vehicleId: bigint, companyId: bigint) {
    await this.getExisting(driverId, companyId);

    const released = await this.driverRepository.releaseVehicle(
      driverId,
      vehicleId,
    );
    if (!released) {
      throw new NotFoundException(
        'Active driver-vehicle assignment not found.',
      );
    }

    return { released: true };
  }

  private async getExisting(id: bigint, companyId: bigint) {
    const driver = await this.driverRepository.findById(id, companyId);
    if (!driver) {
      throw new NotFoundException('Driver not found.');
    }

    return driver;
  }

  private async ensureUniqueFields(
    companyId: bigint,
    employeeNo?: string,
    licenseNo?: string,
    excludedId?: bigint,
  ) {
    if (employeeNo) {
      const existing = await this.driverRepository.findByEmployeeNo(
        companyId,
        employeeNo,
      );
      if (existing && existing.id !== excludedId) {
        throw new BadRequestException('Employee number already exists.');
      }
    }

    if (licenseNo) {
      const existing = await this.driverRepository.findByLicenseNo(
        companyId,
        licenseNo,
      );
      if (existing && existing.id !== excludedId) {
        throw new BadRequestException('License number already exists.');
      }
    }
  }
}
