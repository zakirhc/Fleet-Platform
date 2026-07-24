import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create User' })
  create(
    @Req() req: { user: { companyId: number } },
    @Body() dto: CreateUserDto,
  ) {
    return this.userService.create(BigInt(req.user.companyId), dto);
  }

  @Get()
  @ApiOperation({ summary: 'List Users' })
  findAll(@Req() req: { user: { companyId: number } }) {
    return this.userService.findAll(BigInt(req.user.companyId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get User' })
  async findOne(
    @Param('id') id: string,
    @Req() req: { user: { companyId: number } },
  ) {
    const user = await this.userService.findById(BigInt(id));
    if (!user || user.companyId !== BigInt(req.user.companyId))
      throw new ForbiddenException();
    return user;
  }

  @Patch(':id/password')
  async changePassword(
    @Param('id') id: string,
    @Req() req: { user: { companyId: number } },
    @Body() dto: ChangePasswordDto,
  ) {
    const user = await this.userService.findById(BigInt(id));
    if (!user || user.companyId !== BigInt(req.user.companyId))
      throw new ForbiddenException();
    return this.userService.changePassword(BigInt(id), dto.password);
  }
}
