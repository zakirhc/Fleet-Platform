import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignUserRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleCodes: string[];
}
