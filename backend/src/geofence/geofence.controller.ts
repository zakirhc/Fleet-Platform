import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { CreateTraccarGeofenceDto } from './dto/create-traccar-geofence.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { GeofenceService } from './geofence.service';

@ApiTags('Geofences and alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('geofences')
export class GeofenceController {
  constructor(private readonly service: GeofenceService) {}

  @Get()
  list(@Req() req: { user: { companyId: number } }) {
    return this.service.list(BigInt(req.user.companyId));
  }

  @Get('available')
  available(@Req() req: { user: { companyId: number } }) {
    return this.service.available(BigInt(req.user.companyId));
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Link an existing Traccar geofence to this company' })
  create(
    @Req() req: { user: { companyId: number } },
    @Body() dto: CreateGeofenceDto,
  ) {
    return this.service.create(BigInt(req.user.companyId), dto);
  }

  @Post('traccar')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Create a circular geofence in Traccar and link it to this company' })
  createInTraccar(
    @Req() req: { user: { companyId: number } },
    @Body() dto: CreateTraccarGeofenceDto,
  ) {
    return this.service.createInTraccar(BigInt(req.user.companyId), dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { companyId: number } },
  ) {
    return this.service.remove(BigInt(req.user.companyId), BigInt(id));
  }

  @Get('events/history')
  events(
    @Req() req: { user: { companyId: number } },
    @Query() query: EventQueryDto,
  ) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 24 * 60 * 60 * 1000);
    return this.service.events(BigInt(req.user.companyId), from, to, query.limit);
  }

  @Get('alerts/rules')
  rules(@Req() req: { user: { companyId: number } }) {
    return this.service.listRules(BigInt(req.user.companyId));
  }

  @Post('alerts/rules')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  createRule(
    @Req() req: { user: { companyId: number } },
    @Body() dto: CreateAlertRuleDto,
  ) {
    return this.service.createRule(BigInt(req.user.companyId), dto);
  }

  @Delete('alerts/rules/:id')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  removeRule(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { companyId: number } },
  ) {
    return this.service.removeRule(BigInt(req.user.companyId), BigInt(id));
  }
}
