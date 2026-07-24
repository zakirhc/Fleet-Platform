import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UseGuards,
  } from '@nestjs/common';
  import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
  } from '@nestjs/swagger';
  
  import { JwtAuthGuard } from '../auth/jwt-auth.guard';
  
  import { VehicleService } from './vehicle.service';
  
  import { CreateVehicleDto } from './dto/create-vehicle.dto';
  import { UpdateVehicleDto } from './dto/update-vehicle.dto';
  import { Request as ExpressRequest } from 'express';
  
  @ApiTags('Vehicles')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('vehicles')
  export class VehicleController {
    constructor(
      private readonly vehicleService: VehicleService,
    ) {}
  
    @Post()
    @ApiOperation({ summary: 'Create vehicle' })
    create(
      @Req() req,
      @Body() dto: CreateVehicleDto,
    ) {
      return this.vehicleService.create(
        BigInt(req.user.companyId),
        dto,
      );
    }
  
    @Get()
    @ApiOperation({ summary: 'List vehicles' })
    findAll(@Req() req) {
      return this.vehicleService.findAll(
        BigInt(req.user.companyId),
      );
    }
  
    @Get(':id')
    findOne(
      @Param('id') id: string,
      @Req() req,
    ) {
      return this.vehicleService.findOne(
        BigInt(id),
        BigInt(req.user.companyId),
      );
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update vehicle' })
    update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateVehicleDto,
      @Req() req: ExpressRequest & { user: any },
    ) {
      return this.vehicleService.update(
        BigInt(id),
        BigInt(req.user.companyId),
        dto,
      );
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete vehicle' })
    remove(
      @Param('id', ParseIntPipe) id: number,
      @Req() req,
    ) {
      return this.vehicleService.remove(
        BigInt(id),
        BigInt(req.user.companyId),
      );
    }
  
  @Patch(':id/device/:deviceId')
    @ApiOperation({ summary: 'Assign Traccar device' })
    assignDevice(
      @Param('id', ParseIntPipe) id: number,
      @Req() req,
      @Param('deviceId', ParseIntPipe) deviceId: number,
    ) {
      return this.vehicleService.assignDevice(
        BigInt(id),
        BigInt(req.user.companyId),
        BigInt(deviceId),
      );
    }

  @Delete(':id/device')
  @ApiOperation({ summary: 'Unassign Traccar device' })
  unassignDevice(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ) {
    return this.vehicleService.unassignDevice(
      BigInt(id),
      BigInt(req.user.companyId),
    );
  }
  }
