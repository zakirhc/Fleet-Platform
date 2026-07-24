import { IsOptional, IsString } from 'class-validator';

export class AssignDriverVehicleDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
