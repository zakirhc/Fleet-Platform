import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RegisterMobileDeviceDto } from './dto/register-mobile-device.dto';
import { MobilePushService } from './mobile-push.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Mobile') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Controller('mobile-devices')
export class MobileController {
  constructor(private readonly prisma: PrismaService, private readonly push: MobilePushService) {}
  @Post() async register(@Req() req: { user: { sub: number; companyId: number } }, @Body() dto: RegisterMobileDeviceDto) {
    return this.prisma.mobileDevice.upsert({ where: { fcmToken: dto.fcmToken }, create: { companyId: BigInt(req.user.companyId), userId: BigInt(req.user.sub), fcmToken: dto.fcmToken, deviceName: dto.deviceName }, update: { companyId: BigInt(req.user.companyId), userId: BigInt(req.user.sub), deviceName: dto.deviceName, active: true, lastSeenAt: new Date() } });
  }
  @Delete(':id') async remove(@Req() req: { user: { sub: number; companyId: number } }, @Param('id') id: string) { await this.prisma.mobileDevice.updateMany({ where: { id: BigInt(id), userId: BigInt(req.user.sub), companyId: BigInt(req.user.companyId) }, data: { active: false } }); return { removed: true }; }
  @Post('test') @Roles('SUPER_ADMIN', 'COMPANY_ADMIN') test(@Req() req: { user: { companyId: number } }) { return this.push.sendCompany(BigInt(req.user.companyId), 'Fleet Platform', 'Android push notifications are configured.', { type: 'test' }); }
}
