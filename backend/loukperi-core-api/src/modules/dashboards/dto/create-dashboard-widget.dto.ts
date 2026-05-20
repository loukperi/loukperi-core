import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateDashboardWidgetDto {
  @ApiProperty({
    example: 'records_by_status',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  widget_type!: string;

  @ApiProperty({
    example: 'Records by Status',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  position_x?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  position_y?: number;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  width?: number;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  height?: number;

  @ApiPropertyOptional({
    example: {
      entity_type: 'record',
      group_by: 'status',
    },
  })
  @IsOptional()
  @IsObject()
  settings_jsonb?: Record<string, unknown>;
}