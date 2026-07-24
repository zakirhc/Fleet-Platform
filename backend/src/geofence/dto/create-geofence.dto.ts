import { IsInt, IsString, MaxLength } from 'class-validator';

export class CreateGeofenceDto {
  @IsInt()
  tcGeofenceId: number;

  @IsString()
  @MaxLength(128)
  name: string;
}
