import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { RoleService } from './role.service';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
@Controller('roles')
export class RoleController {
  constructor(private readonly roles: RoleService) {}

  @Get()
  list() {
    return this.roles.list();
  }

  @Get('users/:userId')
  listUserRoles(
    @Param('userId') userId: string,
    @Req() req: { user: { companyId: number } },
  ) {
    return this.roles.rolesForUser(BigInt(userId), BigInt(req.user.companyId));
  }

  @Put('users/:userId')
  replaceUserRoles(
    @Param('userId') userId: string,
    @Req() req: { user: { companyId: number } },
    @Body() dto: AssignUserRolesDto,
  ) {
    return this.roles.replaceUserRoles(
      BigInt(userId),
      BigInt(req.user.companyId),
      dto.roleCodes,
    );
  }
}
