import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateDashboardWidgetDto {
  @ApiPropertyOptional({
    example: 'Records by Status',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  position_x?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  position_y?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  width?: number;

  @ApiPropertyOptional()
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