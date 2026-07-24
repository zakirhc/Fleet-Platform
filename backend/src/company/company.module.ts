import { Module } from '@nestjs/common';

import { CompanyController } from './controllers/company.controller';
import { CompanyService } from './services/company.service';
import { CompanyRepository } from './repositories/company.repository';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, CompanyRepository],
})
export class CompanyModule {}
