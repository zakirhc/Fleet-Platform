import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import {
  WhatsappMessageDirection,
  WhatsappMessageStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWhatsappAccountDto } from './dto/create-whatsapp-account.dto';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createAccount(companyId: bigint, dto: CreateWhatsappAccountDto) {
    return this.prisma.whatsappAccount.create({
      data: {
        companyId,
        phoneNumberId: dto.phoneNumberId,
        displayName: dto.displayName,
        accessTokenCiphertext: this.encrypt(dto.accessToken),
        verifyTokenCiphertext: this.encrypt(dto.verifyToken),
        appSecretCiphertext: dto.appSecret ? this.encrypt(dto.appSecret) : null,
      },
      select: {
        id: true,
        phoneNumberId: true,
        displayName: true,
        active: true,
        createdAt: true,
      },
    });
  }

  listAccounts(companyId: bigint) {
    return this.prisma.whatsappAccount.findMany({
      where: { companyId },
      select: {
        id: true,
        phoneNumberId: true,
        displayName: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listMessages(companyId: bigint) {
    return this.prisma.whatsappMessage.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async send(
    companyId: bigint,
    accountId: bigint,
    recipient: string,
    body: string,
  ) {
    const account = await this.prisma.whatsappAccount.findFirst({
      where: { id: accountId, companyId, active: true },
    });
    if (!account)
      throw new NotFoundException('Active WhatsApp account not found.');
    const message = await this.prisma.whatsappMessage.create({
      data: {
        companyId,
        accountId,
        direction: WhatsappMessageDirection.OUTBOUND,
        recipient,
        body,
      },
    });
    return this.deliver(account, message);
  }

  @Interval(30_000)
  async deliverQueued() {
    const messages = await this.prisma.whatsappMessage.findMany({
      where: { status: WhatsappMessageStatus.QUEUED },
      include: { account: true },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    await Promise.all(
      messages.map(async (message) => {
        try {
          await this.deliver(message.account, message);
        } catch {
          // The message has already been marked FAILED; later messages continue.
        }
      }),
    );
  }

  private async deliver(
    account: { phoneNumberId: string; accessTokenCiphertext: string },
    message: { id: bigint; recipient: string; body: string },
  ) {
    try {
      const version =
        this.config.get<string>('WHATSAPP_GRAPH_API_VERSION') ?? 'v23.0';
      const response = await fetch(
        `https://graph.facebook.com/${version}/${account.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.decrypt(account.accessTokenCiphertext)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: message.recipient,
            type: 'text',
            text: { body: message.body },
          }),
        },
      );
      const payload = (await response.json()) as {
        messages?: { id: string }[];
        error?: { message?: string };
      };
      if (!response.ok || !payload.messages?.[0]?.id)
        throw new Error(
          payload.error?.message ?? 'WhatsApp API rejected the message.',
        );
      return this.prisma.whatsappMessage.update({
        where: { id: message.id },
        data: {
          status: WhatsappMessageStatus.SENT,
          providerMessageId: payload.messages[0].id,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.whatsappMessage.update({
        where: { id: message.id },
        data: {
          status: WhatsappMessageStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw new BadRequestException('Unable to send WhatsApp message.');
    }
  }

  async queue(companyId: bigint, recipient: string, body: string) {
    const account = await this.prisma.whatsappAccount.findFirst({
      where: { companyId, active: true },
      orderBy: { id: 'asc' },
    });
    if (!account) return null;
    return this.prisma.whatsappMessage.create({
      data: {
        companyId,
        accountId: account.id,
        direction: WhatsappMessageDirection.OUTBOUND,
        recipient,
        body,
        status: WhatsappMessageStatus.QUEUED,
      },
    });
  }

  async verifyWebhook(companyId: bigint, verifyToken: string) {
    const account = await this.prisma.whatsappAccount.findFirst({
      where: { companyId, active: true },
      orderBy: { id: 'asc' },
    });
    return Boolean(
      account &&
      this.safeEqual(this.decrypt(account.verifyTokenCiphertext), verifyToken),
    );
  }

  async processWebhook(
    companyId: bigint,
    rawBody: Buffer | undefined,
    signature: string | undefined,
    payload: any,
  ) {
    const account = await this.prisma.whatsappAccount.findFirst({
      where: { companyId, active: true },
      orderBy: { id: 'asc' },
    });
    if (!account)
      throw new NotFoundException('Active WhatsApp account not found.');
    if (
      account.appSecretCiphertext &&
      (!rawBody ||
        !this.validSignature(
          rawBody,
          signature,
          this.decrypt(account.appSecretCiphertext),
        ))
    )
      throw new BadRequestException('Invalid webhook signature.');
    const changes =
      payload?.entry?.flatMap((entry: any) => entry.changes ?? []) ?? [];
    await Promise.all(
      changes.flatMap((change: any) =>
        (change.value?.messages ?? []).map((message: any) =>
          this.prisma.whatsappMessage.upsert({
            where: { providerMessageId: message.id },
            create: {
              companyId,
              accountId: account.id,
              direction: WhatsappMessageDirection.INBOUND,
              recipient: message.from,
              body: message.text?.body ?? `[${message.type}]`,
              status: WhatsappMessageStatus.RECEIVED,
              providerMessageId: message.id,
            },
            update: {},
          }),
        ),
      ),
    );
  }

  private key() {
    const key = Buffer.from(
      this.config.get<string>('WHATSAPP_TOKEN_ENCRYPTION_KEY') ?? '',
      'base64',
    );
    if (key.length !== 32)
      throw new BadRequestException(
        'WHATSAPP_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.',
      );
    return key;
  }
  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
  }
  private decrypt(value: string) {
    const [iv, tag, encrypted] = value
      .split('.')
      .map((part) => Buffer.from(part, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
  private validSignature(
    body: Buffer,
    signature: string | undefined,
    secret: string,
  ) {
    const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    return Boolean(signature && this.safeEqual(expected, signature));
  }
  private safeEqual(left: string, right: string) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
