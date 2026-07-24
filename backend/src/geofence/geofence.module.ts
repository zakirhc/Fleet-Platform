import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { GeofenceController } from './geofence.controller';
import { GeofenceService } from './geofence.service';

@Module({
  imports: [PrismaModule, WhatsappModule],
  controllers: [GeofenceController],
  providers: [GeofenceService],
})
export class GeofenceModule {}
