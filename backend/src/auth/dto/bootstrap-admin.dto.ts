import { IsString } from 'class-validator';

export class BootstrapAdminDto {
  @IsString()
  username: string;

  @IsString()
  bootstrapSecret: string;
}
