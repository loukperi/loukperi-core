import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDashboardDto {
  @ApiProperty({
    example: 'Main Dashboard',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'workspace',
    description: 'Example values: workspace, user, records.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  scope_type!: string;

  @ApiPropertyOptional({
    example: null,
  })
  @IsOptional()
  @IsUUID('4')
  scope_id?: string;

  @ApiPropertyOptional({
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}