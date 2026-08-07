import { ConflictException, Injectable } from '@nestjs/common';

import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserStatus } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly repository: UserRepository) {}

  async create(companyId: bigint, dto: CreateUserDto) {
    const username = await this.repository.findByUsername(dto.username);

    if (username) {
      throw new ConflictException('Username already exists.');
    }

    if (dto.email) {
      const email = await this.repository.findByEmail(dto.email);

      if (email) {
        throw new ConflictException('Email already exists.');
      }
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.repository.create({
      uuid: randomUUID(),
      companyId,
      username: dto.username,
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      status: UserStatus.ACTIVE,
    });
  }

  async findAll(companyId: bigint) {
    return this.repository.findAll(companyId);
  }

  async findById(id: bigint) {
    return this.repository.findById(id);
  }

  async changePassword(id: bigint, password: string) {
    return this.repository.updatePassword(id, await argon2.hash(password));
  }
}
