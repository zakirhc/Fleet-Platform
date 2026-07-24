import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DriverStatus } from '@prisma/client';

export class CreateDriverDto {
  @IsString()
  @MaxLength(150)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  employeeNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  licenseType?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  licenseIssueDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  licenseExpiry?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  passportNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  bloodGroup?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  joiningDate?: Date;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  emergencyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  photo?: string;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}
