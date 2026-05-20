import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateSavedViewDto {
  @ApiPropertyOptional({
    example: 'Ανοιχτές Υποθέσεις',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    enum: ['private', 'workspace', 'public'],
  })
  @IsOptional()
  @IsIn(['private', 'workspace', 'public'])
  visibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({
    example: {
      status: ['open', 'in_progress'],
      priority: ['high', 'urgent'],
    },
  })
  @IsOptional()
  @IsObject()
  filters_jsonb?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: ['code', 'title', 'status', 'priority', 'assignee_user', 'due_at'],
  })
  @IsOptional()
  @IsArray()
  columns_jsonb?: unknown[];

  @ApiPropertyOptional({
    example: {
      field: 'updated_at',
      direction: 'desc',
    },
  })
  @IsOptional()
  @IsObject()
  sorting_jsonb?: Record<string, unknown>;
}