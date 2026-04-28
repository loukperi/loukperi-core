import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  entity_type!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  report_type!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  definition_jsonb?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_system?: boolean;
}
