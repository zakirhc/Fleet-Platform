import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportFrequency, ReportType } from '@prisma/client';
export class CreateReportScheduleDto { @IsEnum(ReportType) reportType: ReportType; @IsEnum(ReportFrequency) frequency: ReportFrequency; @IsOptional() @IsString() @MaxLength(150) recipient?: string; }
