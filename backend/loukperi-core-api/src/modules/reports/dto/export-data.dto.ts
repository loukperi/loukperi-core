import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ExportDataDto {
  @ApiProperty()
  @IsString()
  @MaxLength(60)
  entity_type!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  columns?: string[];

  @ApiProperty({ enum: ['csv', 'xlsx', 'pdf'] })
  @IsIn(['csv', 'xlsx', 'pdf'])
  format!: 'csv' | 'xlsx' | 'pdf';
}
