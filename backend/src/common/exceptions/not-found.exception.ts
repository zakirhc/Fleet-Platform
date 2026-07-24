import { NotFoundException } from '@nestjs/common';

export class EntityNotFoundException extends NotFoundException {
  constructor(entity: string, id: string | number | bigint) {
    super(`${entity} '${id}' was not found.`);
  }
}