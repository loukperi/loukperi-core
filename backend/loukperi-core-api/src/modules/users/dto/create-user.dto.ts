import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEmail, IsOptional, IsPhoneNumber, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  first_name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  last_name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  job_title?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  role_ids?: string[];
}
