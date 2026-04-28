import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateContactDto {
  @ApiProperty()
  @IsUUID('4')
  account_id!: string;

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
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  job_title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source_system?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source_external_id?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata_jsonb?: Record<string, unknown>;
}
