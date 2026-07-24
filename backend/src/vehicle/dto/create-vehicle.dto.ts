import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
  } from 'class-validator';
  
  import { VehicleStatus } from '@prisma/client';

  export class CreateVehicleDto {
  
    @IsString()
    @MaxLength(50)
    registrationNo: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(50)
    fleetNo?: string;
  
    @IsOptional()
    @IsInt()
    traccarDeviceId?: number;
  
    @IsOptional()
    @IsString()
    make?: string;
  
    @IsOptional()
    @IsString()
    model?: string;
  
    @IsOptional()
    @IsInt()
    year?: number;
  
    @IsOptional()
    @IsString()
    chassisNo?: string;
  
    @IsOptional()
    @IsString()
    engineNo?: string;
  
    @IsOptional()
    @IsString()
    color?: string;
  
    @IsOptional()
    @IsString()
    fuelType?: string;
  
@IsOptional()
@IsEnum(VehicleStatus)
status?: VehicleStatus;
  
    @IsOptional()
    @IsString()
    remarks?: string;
  }