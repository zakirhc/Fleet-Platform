import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterMobileDeviceDto {
  @IsString()
  @MaxLength(512)
  fcmToken: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  deviceName?: string;
}
