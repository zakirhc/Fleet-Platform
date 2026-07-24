import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from '../prisma/prisma.module';
import { TrackingController } from './tracking.controller';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [TrackingController],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingGateway, TrackingService],
})
export class TrackingModule {}
