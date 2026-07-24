import { IsEnum, IsString, MaxLength } from 'class-validator';
import { GeofenceEventType } from '@prisma/client';

export class CreateAlertRuleDto {
  @IsString()
  geofenceId: string;

  @IsEnum(GeofenceEventType)
  eventType: GeofenceEventType;

  @IsString()
  @MaxLength(32)
  recipient: string;
}
