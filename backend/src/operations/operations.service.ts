import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseRecordDto, CreateFuelRecordDto, CreateMaintenanceScheduleDto, CreateWorkOrderDto } from './dto/create-operations.dto';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}
  private async vehicle(companyId: bigint, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: BigInt(id), companyId, deletedAt: null } });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    return vehicle;
  }
  async schedules(companyId: bigint) { return this.prisma.maintenanceSchedule.findMany({ where:{companyId}, include:{vehicle:{select:{registrationNo:true}}}, orderBy:{dueDate:'asc'} }); }
  async createSchedule(companyId: bigint, dto: CreateMaintenanceScheduleDto) { await this.vehicle(companyId,dto.vehicleId); return this.prisma.maintenanceSchedule.create({data:{companyId,vehicleId:BigInt(dto.vehicleId),name:dto.name,intervalDays:dto.intervalDays,dueDate:dto.dueDate?new Date(dto.dueDate):undefined,dueOdometer:dto.dueOdometer}}); }
  async workOrders(companyId: bigint) { return this.prisma.workOrder.findMany({where:{companyId},include:{vehicle:{select:{registrationNo:true}},schedule:{select:{name:true}}},orderBy:{openedAt:'desc'}}); }
  async createWorkOrder(companyId: bigint,dto: CreateWorkOrderDto) { await this.vehicle(companyId,dto.vehicleId); const number=`WO-${Date.now()}`; return this.prisma.workOrder.create({data:{companyId,vehicleId:BigInt(dto.vehicleId),scheduleId:dto.scheduleId?BigInt(dto.scheduleId):undefined,number,title:dto.title,vendor:dto.vendor,estimatedCost:dto.estimatedCost,notes:dto.notes}}); }
  async updateWorkOrder(companyId: bigint,id: string,status: WorkOrderStatus,actualCost?: number) { const record=await this.prisma.workOrder.findFirst({where:{id:BigInt(id),companyId}}); if(!record) throw new NotFoundException('Work order not found.'); return this.prisma.workOrder.update({where:{id:record.id},data:{status,actualCost,completedAt:status===WorkOrderStatus.COMPLETED?new Date():undefined}}); }
  async fuel(companyId: bigint) { return this.prisma.fuelRecord.findMany({where:{companyId},include:{vehicle:{select:{registrationNo:true}}},orderBy:{filledAt:'desc'},take:200}); }
  async createFuel(companyId: bigint,dto: CreateFuelRecordDto) { await this.vehicle(companyId,dto.vehicleId); return this.prisma.fuelRecord.create({data:{companyId,vehicleId:BigInt(dto.vehicleId),filledAt:new Date(dto.filledAt),litres:dto.litres,totalAmount:dto.totalAmount,odometer:dto.odometer,station:dto.station,notes:dto.notes}}); }
  async expenses(companyId: bigint) { return this.prisma.expenseRecord.findMany({where:{companyId},include:{vehicle:{select:{registrationNo:true}}},orderBy:{expenseDate:'desc'},take:200}); }
  async createExpense(companyId: bigint,dto: CreateExpenseRecordDto) { if(dto.vehicleId) await this.vehicle(companyId,dto.vehicleId); return this.prisma.expenseRecord.create({data:{companyId,vehicleId:dto.vehicleId?BigInt(dto.vehicleId):undefined,category:dto.category,expenseDate:new Date(dto.expenseDate),amount:dto.amount,vendor:dto.vendor,description:dto.description}}); }
}
