import { BadRequestException, Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportScheduleDto } from './dto/create-report-schedule.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService, private readonly whatsapp: WhatsappService) {}
  async utilisation(companyId: bigint, from: Date, to: Date) {
    if (from >= to) throw new BadRequestException('Invalid report date range.');
    const vehicles = await this.prisma.vehicle.findMany({where:{companyId,deletedAt:null},include:{deviceLink:true}});
    const ids = vehicles.map(v=>Number(v.deviceLink?.tc_device_id ?? v.traccarDeviceId)).filter(Boolean);
    const [positions, events] = await Promise.all([
      this.prisma.tc_positions.findMany({where:{deviceid:{in:ids},fixtime:{gte:from,lte:to},valid:1},select:{deviceid:true,fixtime:true,speed:true,latitude:true,longitude:true},orderBy:{fixtime:'asc'}}),
      this.prisma.tc_events.findMany({where:{deviceid:{in:ids},eventtime:{gte:from,lte:to}},select:{deviceid:true,type:true}}),
    ]);
    return vehicles.map(vehicle=>{ const deviceId=Number(vehicle.deviceLink?.tc_device_id ?? vehicle.traccarDeviceId); const points=positions.filter(p=>p.deviceid===deviceId); const ev=events.filter(e=>e.deviceid===deviceId); const moving=points.filter(p=>p.speed>1).length; const idle=points.filter(p=>p.speed<=1).length; return {vehicleId:vehicle.id,registrationNo:vehicle.registrationNo,positions:points.length,movingSamples:moving,idleSamples:idle,overspeedEvents:ev.filter(e=>e.type.toLowerCase().includes('overspeed')).length,behaviourEvents:ev.filter(e=>/hard(acceleration|braking|cornering)/i.test(e.type)).length}; });
  }
  async driverBehaviour(companyId: bigint, from: Date, to: Date) {
    const rows=await this.utilisation(companyId,from,to); return rows.map(row=>({vehicleId:row.vehicleId,registrationNo:row.registrationNo,overspeedEvents:row.overspeedEvents,harshEvents:row.behaviourEvents,riskScore:row.overspeedEvents*3+row.behaviourEvents*5})).sort((a,b)=>b.riskScore-a.riskScore);
  }
  async idling(companyId: bigint, from: Date, to: Date) { const rows=await this.utilisation(companyId,from,to); return rows.map(row=>({vehicleId:row.vehicleId,registrationNo:row.registrationNo,idleSamples:row.idleSamples,movingSamples:row.movingSamples,idlePercentage:row.positions?Number((row.idleSamples*100/row.positions).toFixed(1)):0})).sort((a,b)=>b.idlePercentage-a.idlePercentage); }
  async fuelExpense(companyId: bigint, from: Date, to: Date) {
    if (from >= to) throw new BadRequestException('Invalid report date range.');
    const [fuel, expenses] = await Promise.all([
      this.prisma.fuelRecord.findMany({ where: { companyId, filledAt: { gte: from, lte: to } }, select: { litres: true, totalAmount: true } }),
      this.prisma.expenseRecord.findMany({ where: { companyId, expenseDate: { gte: from, lte: to } }, select: { amount: true } }),
    ]);
    const sum = (values: Array<{ toString(): string }>) => values.reduce<number>((total, value) => total + Number(value.toString()), 0);
    const fuelLitres = sum(fuel.map(row => row.litres)); const fuelAmount = sum(fuel.map(row => row.totalAmount)); const expenseAmount = sum(expenses.map(row => row.amount));
    return { fuelRecords: fuel.length, fuelLitres: Number(fuelLitres.toFixed(3)), fuelAmount: Number(fuelAmount.toFixed(2)), expenseRecords: expenses.length, expenseAmount: Number(expenseAmount.toFixed(2)), totalCost: Number((fuelAmount + expenseAmount).toFixed(2)) };
  }
  async trips(companyId: bigint, from: Date, to: Date) {
    if (from >= to) throw new BadRequestException('Invalid report date range.');
    const vehicles = await this.prisma.vehicle.findMany({ where: { companyId, deletedAt: null }, include: { deviceLink: true } });
    const deviceIds = vehicles.map(vehicle => Number(vehicle.deviceLink?.tc_device_id ?? vehicle.traccarDeviceId)).filter((id): id is number => Boolean(id));
    const positions = await this.prisma.tc_positions.findMany({ where: { deviceid: { in: deviceIds }, fixtime: { gte: from, lte: to }, valid: 1 }, select: { deviceid: true, fixtime: true, latitude: true, longitude: true, speed: true }, orderBy: [{ deviceid: 'asc' }, { fixtime: 'asc' }] });
    const grouped = new Map<number, typeof positions>();
    for (const point of positions) grouped.set(point.deviceid, [...(grouped.get(point.deviceid) ?? []), point]);
    return vehicles.map(vehicle => {
      const deviceId = Number(vehicle.deviceLink?.tc_device_id ?? vehicle.traccarDeviceId);
      const points = grouped.get(deviceId) ?? [];
      let tripCount = 0, distanceKm = 0, movingSamples = 0;
      for (let index = 0; index < points.length; index++) {
        const current = points[index]; const previous = points[index - 1];
        if (!previous || current.fixtime.getTime() - previous.fixtime.getTime() > 30 * 60_000) tripCount++;
        else distanceKm += this.distanceKm(previous.latitude, previous.longitude, current.latitude, current.longitude);
        if (current.speed > 1) movingSamples++;
      }
      return { vehicleId: vehicle.id, registrationNo: vehicle.registrationNo, trips: tripCount, distanceKm: Number(distanceKm.toFixed(2)), movingSamples, points: points.length };
    }).sort((a, b) => b.distanceKm - a.distanceKm);
  }
  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const radians = (value: number) => value * Math.PI / 180;
    const a = Math.sin(radians(lat2 - lat1) / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  toCsv(rows: Record<string, unknown>[]) { if(!rows.length) return ''; const keys=Object.keys(rows[0]); return [keys.join(','),...rows.map(row=>keys.map(k=>JSON.stringify(row[k]??'')).join(','))].join('\n'); }
  schedules(companyId: bigint) { return this.prisma.reportSchedule.findMany({where:{companyId},orderBy:{createdAt:'desc'}}); }
  createSchedule(companyId: bigint,dto: CreateReportScheduleDto) { return this.prisma.reportSchedule.create({data:{companyId,reportType:dto.reportType,frequency:dto.frequency,recipient:dto.recipient}}); }
  @Interval(600_000)
  async deliverScheduledReports() { const schedules=await this.prisma.reportSchedule.findMany({where:{active:true,recipient:{not:null}}}); const now=new Date(); for(const schedule of schedules){const interval=schedule.frequency==='DAILY'?86400000:schedule.frequency==='WEEKLY'?604800000:2592000000;if(schedule.lastRunAt&&now.getTime()-schedule.lastRunAt.getTime()<interval)continue;const from=new Date(now.getTime()-86400000);const rows=schedule.reportType==='DRIVER_BEHAVIOUR'||schedule.reportType==='OVERSPEED'?await this.driverBehaviour(schedule.companyId,from,now):schedule.reportType==='IDLING'?await this.idling(schedule.companyId,from,now):schedule.reportType==='TRIPS'?await this.trips(schedule.companyId,from,now):schedule.reportType==='FUEL_EXPENSE'?[await this.fuelExpense(schedule.companyId,from,now)]:await this.utilisation(schedule.companyId,from,now);const body=this.scheduleSummary(schedule.reportType,rows);const queued=await this.whatsapp.queue(schedule.companyId,schedule.recipient!,body);if(queued)await this.prisma.reportSchedule.update({where:{id:schedule.id},data:{lastRunAt:now}})} }
  private scheduleSummary(type: string, rows: Record<string, any>[]) { if(type==='TRIPS') return `Fleet trips report: ${rows.length} vehicles, ${rows.reduce((total,row)=>total+row.trips,0)} trips, ${rows.reduce((total,row)=>total+row.distanceKm,0).toFixed(1)} km.`; if(type==='IDLING') return `Fleet idling report: ${rows.length} vehicles, ${rows.reduce((total,row)=>total+row.idleSamples,0)} idle samples.`; if(type==='FUEL_EXPENSE'){const row=rows[0];return `Fleet fuel & expense report: ${row.fuelRecords} fuel records (${row.fuelLitres} litres), ${row.expenseRecords} expenses, total cost ${row.totalCost}.`}; if(type==='DRIVER_BEHAVIOUR'||type==='OVERSPEED') return `Fleet ${type==='OVERSPEED'?'overspeed':'driver behaviour'} report: ${rows.length} vehicles, ${rows.reduce((total,row)=>total+row.overspeedEvents,0)} overspeed and ${rows.reduce((total,row)=>total+row.harshEvents,0)} harsh-driving events.`; return `Fleet utilisation report: ${rows.length} vehicles, ${rows.reduce((total,row)=>total+row.overspeedEvents,0)} overspeed events, ${rows.reduce((total,row)=>total+row.behaviourEvents,0)} driver-behaviour events.`; }
}
