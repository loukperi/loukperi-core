import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class RunReportDto {
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['json', 'csv', 'xlsx'] })
  @IsOptional()
  @IsIn(['json', 'csv', 'xlsx'])
  export_format?: 'json' | 'csv' | 'xlsx';
}
