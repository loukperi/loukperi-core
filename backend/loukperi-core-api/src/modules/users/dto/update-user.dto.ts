import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ enum: ['invited', 'active', 'suspended'] })
  @IsOptional()
  @IsIn(['invited', 'active', 'suspended'])
  membership_status?: 'invited' | 'active' | 'suspended';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  job_title?: string;
}
