import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validationSchema } from './config/env.validation';

import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { CompanyModule } from './company/company.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { DeviceModule } from './device/device.module';
import { DriverModule } from './driver/driver.module';
import { TrackingModule } from './tracking/tracking.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { GeofenceModule } from './geofence/geofence.module';
import { OperationsModule } from './operations/operations.module';
import { ReportModule } from './report/report.module';
import { DocumentModule } from './document/document.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
    }),

    PrismaModule,

    HealthModule,

    CompanyModule,

    AuthModule,

    UserModule,

    RoleModule,

    VehicleModule,

    DeviceModule,

    DriverModule,

    TrackingModule,

    WhatsappModule,

    GeofenceModule,
    OperationsModule,
    ReportModule,
    DocumentModule,
  ],
})
export class AppModule {}
