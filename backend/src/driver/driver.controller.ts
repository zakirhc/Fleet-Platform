import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDriverDto } from './dto/create-driver.dto';
import { AssignDriverVehicleDto } from './dto/assign-driver-vehicle.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverService } from './driver.service';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post()
  @ApiOperation({ summary: 'Create a driver' })
  create(
    @Req() req: { user: { companyId: number } },
    @Body() dto: CreateDriverDto,
  ) {
    return this.driverService.create(BigInt(req.user.companyId), dto);
  }

  @Get()
  @ApiOperation({ summary: 'List company drivers' })
  findAll(@Req() req: { user: { companyId: number } }) {
    return this.driverService.findAll(BigInt(req.user.companyId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a driver' })
  findOne(
    @Param('id') id: string,
    @Req() req: { user: { companyId: number } },
  ) {
    return this.driverService.findOne(
      this.toBigInt(id),
      BigInt(req.user.companyId),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a driver' })
  update(
    @Param('id') id: string,
    @Req() req: { user: { companyId: number } },
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driverService.update(
      this.toBigInt(id),
      BigInt(req.user.companyId),
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a driver' })
  remove(@Param('id') id: string, @Req() req: { user: { companyId: number } }) {
    return this.driverService.remove(
      this.toBigInt(id),
      BigInt(req.user.companyId),
    );
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'List a driver’s active vehicle assignments' })
  findAssignments(
    @Param('id') id: string,
    @Req() req: { user: { companyId: number } },
  ) {
    return this.driverService.findAssignments(
      this.toBigInt(id),
      BigInt(req.user.companyId),
    );
  }

  @Post(':id/vehicles/:vehicleId')
  @ApiOperation({ summary: 'Assign a driver to a vehicle' })
  assignVehicle(
    @Param('id') id: string,
    @Param('vehicleId') vehicleId: string,
    @Req() req: { user: { companyId: number; sub: number } },
    @Body() dto: AssignDriverVehicleDto,
  ) {
    return this.driverService.assignVehicle(
      this.toBigInt(id),
      this.toBigInt(vehicleId),
      BigInt(req.user.companyId),
      BigInt(req.user.sub),
      dto.remarks,
    );
  }

  @Delete(':id/vehicles/:vehicleId')
  @ApiOperation({ summary: 'Release a driver from a vehicle' })
  releaseVehicle(
    @Param('id') id: string,
    @Param('vehicleId') vehicleId: string,
    @Req() req: { user: { companyId: number } },
  ) {
    return this.driverService.releaseVehicle(
      this.toBigInt(id),
      this.toBigInt(vehicleId),
      BigInt(req.user.companyId),
    );
  }

  private toBigInt(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException('ID must be a positive integer.');
    }

    return BigInt(value);
  }
}
