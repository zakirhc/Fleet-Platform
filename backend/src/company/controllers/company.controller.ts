import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyService } from '../services/company.service';

@ApiTags('Company')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated company' })
  findMine(@Req() req: { user: { companyId: number } }) {
    return this.service.findOne(BigInt(req.user.companyId));
  }

  @Patch('me')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  updateMine(
    @Req() req: { user: { companyId: number } },
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.service.update(BigInt(req.user.companyId), dto);
  }
}
