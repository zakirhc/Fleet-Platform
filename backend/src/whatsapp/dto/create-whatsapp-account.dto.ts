import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWhatsappAccountDto {
  @IsString() @MaxLength(64) phoneNumberId: string;
  @IsOptional() @IsString() @MaxLength(150) displayName?: string;
  @IsString() accessToken: string;
  @IsString() verifyToken: string;
  @IsOptional() @IsString() appSecret?: string;
}
