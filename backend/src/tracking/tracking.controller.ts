import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrackingService } from './tracking.service';
import { HistoryQueryDto } from './dto/history-query.dto';

@ApiTags('Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('positions')
  @ApiOperation({ summary: 'Get the latest position for each company vehicle' })
  findLatestPositions(@Req() req: { user: { companyId: number } }) {
    return this.trackingService.findLatestByCompany(BigInt(req.user.companyId));
  }

  @Get('vehicles/:vehicleId/history')
  @ApiOperation({ summary: 'Get Fleet-scoped Traccar position history' })
  history(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Query() query: HistoryQueryDto,
    @Req() req: { user: { companyId: number } },
  ) {
    return this.trackingService.history(
      BigInt(vehicleId),
      BigInt(req.user.companyId),
      new Date(query.from),
      new Date(query.to),
      query.limit,
    );
  }
}
