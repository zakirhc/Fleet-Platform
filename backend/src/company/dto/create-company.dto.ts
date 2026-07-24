import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({
    example: 'ARC',
    maxLength: 20,
  })
  @IsString()
  @Length(2, 20)
  code: string;

  @ApiProperty({
    example: 'Arc Bangladesh Ltd.',
  })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  website?: string;
}
