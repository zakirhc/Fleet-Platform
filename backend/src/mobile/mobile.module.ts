import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MobileController } from './mobile.controller';
import { MobilePushService } from './mobile-push.service';

@Module({ imports: [PrismaModule], controllers: [MobileController], providers: [MobilePushService], exports: [MobilePushService] })
export class MobileModule {}
