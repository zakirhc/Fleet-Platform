import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MobilePushService {
  private readonly logger = new Logger(MobilePushService.name);
  private enabled = false;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    const raw = config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!raw) return;
    try { if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) }); this.enabled = true; }
    catch { this.logger.error('FCM is disabled because FIREBASE_SERVICE_ACCOUNT_JSON is invalid.'); }
  }

  async sendCompany(companyId: bigint, title: string, body: string, data: Record<string, string> = {}) {
    if (!this.enabled) return { sent: 0, disabled: true };
    const devices = await this.prisma.mobileDevice.findMany({ where: { companyId, active: true }, select: { id: true, fcmToken: true } });
    if (!devices.length) return { sent: 0, disabled: false };
    const result = await getMessaging().sendEachForMulticast({ tokens: devices.map(device => device.fcmToken), notification: { title, body }, data });
    const invalid = result.responses.flatMap((response, index) => !response.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(response.error?.code ?? '') ? [devices[index].id] : []);
    if (invalid.length) await this.prisma.mobileDevice.updateMany({ where: { id: { in: invalid } }, data: { active: false } });
    return { sent: result.successCount, disabled: false };
  }
}
