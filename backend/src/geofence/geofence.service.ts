import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { GeofenceEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { CreateTraccarGeofenceDto } from './dto/create-traccar-geofence.dto';

const TRACCAR_EVENT_TYPES = ['geofenceEnter', 'geofenceExit'];

@Injectable()
export class GeofenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  list(companyId: bigint) {
    return this.prisma.fleetGeofence.findMany({
      where: { companyId },
      include: { alertRules: { where: { active: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async available(companyId: bigint) {
    const linked = await this.prisma.fleetGeofence.findMany({
      where: { companyId },
      select: { tcGeofenceId: true },
    });
    return this.prisma.tc_geofences.findMany({
      where: { id: { notIn: linked.map((item) => item.tcGeofenceId) } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true, area: true },
    });
  }

  async create(companyId: bigint, dto: CreateGeofenceDto) {
    const geofence = await this.prisma.tc_geofences.findUnique({
      where: { id: dto.tcGeofenceId },
      select: { id: true },
    });
    if (!geofence) throw new NotFoundException('Traccar geofence not found.');
    return this.prisma.fleetGeofence.create({
      data: { companyId, tcGeofenceId: geofence.id, name: dto.name },
    });
  }

  async createInTraccar(companyId: bigint, dto: CreateTraccarGeofenceDto) {
    const url = this.config.get<string>('TRACCAR_API_URL');
    const username = this.config.get<string>('TRACCAR_API_USER');
    const password = this.config.get<string>('TRACCAR_API_PASSWORD');
    if (!url || !username || !password)
      throw new BadRequestException(
        'Configure TRACCAR_API_URL, TRACCAR_API_USER, and TRACCAR_API_PASSWORD to create geofences.',
      );
    const area = `CIRCLE (${dto.latitude} ${dto.longitude}, ${dto.radiusMetres})`;
    const response = await fetch(`${url.replace(/\/$/, '')}/geofences`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: dto.name,
        description: dto.description ?? '',
        area,
        attributes: {},
      }),
    });
    const geofence = (await response.json().catch(() => null)) as { id?: number; message?: string } | null;
    if (!response.ok || !geofence?.id)
      throw new BadRequestException(geofence?.message ?? 'Traccar rejected the geofence.');
    return this.prisma.fleetGeofence.create({
      data: { companyId, tcGeofenceId: geofence.id, name: dto.name },
    });
  }

  async remove(companyId: bigint, id: bigint) {
    const geofence = await this.prisma.fleetGeofence.findFirst({
      where: { id, companyId },
      include: { _count: { select: { alertRules: true } } },
    });
    if (!geofence) throw new NotFoundException('Fleet geofence not found.');
    if (geofence._count.alertRules)
      throw new BadRequestException('Remove this geofence’s alert rules first.');
    return this.prisma.fleetGeofence.delete({ where: { id } });
  }

  async listRules(companyId: bigint) {
    return this.prisma.alertRule.findMany({
      where: { companyId },
      include: { geofence: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(companyId: bigint, dto: CreateAlertRuleDto) {
    const geofence = await this.prisma.fleetGeofence.findFirst({
      where: { id: BigInt(dto.geofenceId), companyId, active: true },
    });
    if (!geofence) throw new NotFoundException('Active Fleet geofence not found.');
    return this.prisma.alertRule.create({
      data: {
        companyId,
        geofenceId: geofence.id,
        eventType: dto.eventType,
        recipient: dto.recipient,
      },
      include: { geofence: true },
    });
  }

  async removeRule(companyId: bigint, id: bigint) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id, companyId },
    });
    if (!rule) throw new NotFoundException('Alert rule not found.');
    return this.prisma.alertRule.delete({ where: { id } });
  }

  async events(companyId: bigint, from: Date, to: Date, limit = 100) {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to)
      throw new BadRequestException('The event date range is invalid.');
    const [geofences, vehicles] = await Promise.all([
      this.prisma.fleetGeofence.findMany({ where: { companyId, active: true } }),
      this.prisma.vehicle.findMany({
        where: { companyId, deletedAt: null },
        include: { deviceLink: true },
      }),
    ]);
    if (!geofences.length || !vehicles.length) return [];
    const geofenceByTraccarId = new Map(geofences.map((item) => [item.tcGeofenceId, item]));
    const vehicleByDeviceId = new Map(vehicles.map((vehicle) => [Number(vehicle.deviceLink?.tc_device_id ?? vehicle.traccarDeviceId), vehicle]));
    const records = await this.prisma.tc_events.findMany({
      where: {
        type: { in: TRACCAR_EVENT_TYPES },
        geofenceid: { in: geofences.map((item) => item.tcGeofenceId) },
        deviceid: { in: [...vehicleByDeviceId.keys()] },
        eventtime: { gte: from, lte: to },
      },
      orderBy: { eventtime: 'desc' },
      take: limit,
    });
    return records.map((event) => ({
      id: event.id,
      eventType: event.type === 'geofenceEnter' ? GeofenceEventType.ENTER : GeofenceEventType.EXIT,
      eventTime: event.eventtime,
      vehicleId: event.deviceid ? vehicleByDeviceId.get(event.deviceid)?.id ?? null : null,
      registrationNo: event.deviceid ? vehicleByDeviceId.get(event.deviceid)?.registrationNo ?? null : null,
      geofenceId: event.geofenceid ? geofenceByTraccarId.get(event.geofenceid)?.id ?? null : null,
      geofenceName: event.geofenceid ? geofenceByTraccarId.get(event.geofenceid)?.name ?? null : null,
    }));
  }

  @Interval(30_000)
  async queueGeofenceAlerts() {
    const now = new Date();
    const events = await this.eventsForActiveRules(new Date(now.getTime() - 24 * 60 * 60 * 1000), now);
    for (const event of events) {
      const matching = event.eventType === GeofenceEventType.ENTER ? 'geofenceEnter' : 'geofenceExit';
      const rules = await this.prisma.alertRule.findMany({
        where: { companyId: event.companyId, active: true, eventType: event.eventType, geofenceId: event.geofenceId },
      });
      for (const rule of rules) {
        const alreadyDelivered = await this.prisma.alertDelivery.findUnique({
          where: { alertRuleId_tcEventId: { alertRuleId: rule.id, tcEventId: event.id } },
        });
        if (alreadyDelivered) continue;
        const message = await this.whatsapp.queue(
          event.companyId,
          rule.recipient,
          `${event.registrationNo} ${matching === 'geofenceEnter' ? 'entered' : 'exited'} ${event.geofenceName} at ${event.eventTime.toLocaleString()}.`,
        );
        if (!message) continue;
        await this.prisma.alertDelivery.create({
          data: { alertRuleId: rule.id, tcEventId: event.id, whatsappMessageId: message.id },
        });
      }
    }
  }

  private async eventsForActiveRules(from: Date, to: Date) {
    const rules = await this.prisma.alertRule.findMany({
      where: { active: true, geofence: { active: true } },
      include: { geofence: true },
    });
    if (!rules.length) return [];
    const vehicles = await this.prisma.vehicle.findMany({
      where: { deletedAt: null },
      include: { deviceLink: true },
    });
    const vehicleByCompanyAndDevice = new Map(
      vehicles.map((vehicle) => [`${vehicle.companyId}:${vehicle.deviceLink?.tc_device_id ?? vehicle.traccarDeviceId}`, vehicle]),
    );
    const events = await this.prisma.tc_events.findMany({
      where: { type: { in: TRACCAR_EVENT_TYPES }, eventtime: { gte: from, lte: to } },
      orderBy: { eventtime: 'desc' },
      take: 5000,
    });
    const rulesByGeofence = new Map(rules.map((rule) => [`${rule.companyId}:${rule.geofence.tcGeofenceId}`, rule]));
    return events.flatMap((event) => {
      if (!event.deviceid || !event.geofenceid) return [];
      const candidate = rules.find((rule) => {
        const vehicle = vehicleByCompanyAndDevice.get(`${rule.companyId}:${event.deviceid}`);
        return Boolean(vehicle && rule.geofence.tcGeofenceId === event.geofenceid);
      });
      if (!candidate) return [];
      const vehicle = vehicleByCompanyAndDevice.get(`${candidate.companyId}:${event.deviceid}`)!;
      const rule = rulesByGeofence.get(`${candidate.companyId}:${event.geofenceid}`)!;
      return [{
        id: event.id,
        companyId: candidate.companyId,
        geofenceId: candidate.geofenceId,
        geofenceName: candidate.geofence.name,
        eventType: event.type === 'geofenceEnter' ? GeofenceEventType.ENTER : GeofenceEventType.EXIT,
        eventTime: event.eventtime,
        registrationNo: vehicle.registrationNo,
      }];
    });
  }
}
