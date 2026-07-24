import {
    IsOptional,
    IsString,
  } from 'class-validator';
  
  export class VehicleQueryDto {
  
    @IsOptional()
    @IsString()
    search?: string;
  
    @IsOptional()
    @IsString()
    status?: string;
  }