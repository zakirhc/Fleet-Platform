import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { WorkOrderStatus } from '@prisma/client';

export class CreateMaintenanceScheduleDto {
  @IsString() vehicleId: string;
  @IsString() @MaxLength(150) name: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) intervalDays?: number;
  @IsOptional() @IsISO8601() dueDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) dueOdometer?: number;
}
export class CreateWorkOrderDto {
  @IsString() vehicleId: string;
  @IsOptional() @IsString() scheduleId?: string;
  @IsString() @MaxLength(150) title: string;
  @IsOptional() @IsString() @MaxLength(150) vendor?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) estimatedCost?: number;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateWorkOrderDto {
  @IsEnum(WorkOrderStatus) status: WorkOrderStatus;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) actualCost?: number;
}
export class CreateFuelRecordDto {
  @IsString() vehicleId: string;
  @IsISO8601() filledAt: string;
  @Type(() => Number) @IsNumber() @Min(0.001) litres: number;
  @Type(() => Number) @IsNumber() @Min(0) totalAmount: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) odometer?: number;
  @IsOptional() @IsString() @MaxLength(150) station?: string;
  @IsOptional() @IsString() notes?: string;
}
export class CreateExpenseRecordDto {
  @IsOptional() @IsString() vehicleId?: string;
  @IsString() @MaxLength(80) category: string;
  @IsISO8601() expenseDate: string;
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() @MaxLength(150) vendor?: string;
  @IsOptional() @IsString() description?: string;
}
