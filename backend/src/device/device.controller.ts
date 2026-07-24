import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Query,
    Req,
    UseGuards,
  } from '@nestjs/common';
  
  import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
  } from '@nestjs/swagger';
  
  import { JwtAuthGuard } from '../auth/jwt-auth.guard';
  import { DeviceService } from './device.service';
  
  @ApiTags('Devices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('devices')
  export class DeviceController {
    constructor(
      private readonly service: DeviceService,
    ) {}
  
    @Get()
    @ApiOperation({ summary: 'List devices' })
    findAll(@Req() req: { user: { companyId: number } }) {
      return this.service.findAll(BigInt(req.user.companyId));
    }
  
    @Get('search')
    @ApiOperation({ summary: 'Search devices' })
    search(@Query('q') q: string, @Req() req: { user: { companyId: number } }) {
      return this.service.search(BigInt(req.user.companyId), q ?? '');
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get device' })
    findOne(
      @Param('id', ParseIntPipe) id: number,
      @Req() req: { user: { companyId: number } },
    ) {
      return this.service.findOne(id, BigInt(req.user.companyId));
    }
  }
