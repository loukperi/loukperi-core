import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional } from 'class-validator';

export class ExportReportDto {
  @ApiPropertyOptional({
    enum: ['json', 'csv', 'xlsx'],
    default: 'csv',
  })
  @IsOptional()
  @IsIn(['json', 'csv', 'xlsx'])
  format?: 'json' | 'csv' | 'xlsx';

  @ApiPropertyOptional({
    example: {
      group_by: 'status',
      filters: {},
    },
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}