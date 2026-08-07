import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { CompanyRepository } from '../repositories/company.repository';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly repository: CompanyRepository) {}

  async create(dto: CreateCompanyDto) {
    const existing = await this.repository.findByCode(dto.code);

    if (existing) {
      throw new ConflictException(`Company code '${dto.code}' already exists.`);
    }

    return this.repository.create({
      uuid: randomUUID(),
      ...dto,
    });
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: bigint) {
    const company = await this.repository.findById(id);

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    return company;
  }

  async update(id: bigint, dto: UpdateCompanyDto) {
    await this.findOne(id);
    return this.repository.update(id, dto);
  }
}
