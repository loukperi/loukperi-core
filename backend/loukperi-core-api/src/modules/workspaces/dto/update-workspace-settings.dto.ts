import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateWorkspaceSettingsDto {
  @ApiPropertyOptional({
    example: 'Υπόθεση',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  default_record_label_singular?: string;

  @ApiPropertyOptional({
    example: 'Υποθέσεις',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  default_record_label_plural?: string;

  @ApiPropertyOptional({
    example: 'DD/MM/YYYY',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  date_format?: string;

  @ApiPropertyOptional({
    example: 'EUR',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency_code?: string;

  @ApiPropertyOptional({
    example: 'el-GR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  number_format?: string;

  @ApiPropertyOptional({
    example: {
      notes: true,
      files: true,
      tasks: true,
      activityTimeline: true,
    },
  })
  @IsOptional()
  @IsObject()
  features_jsonb?: Record<string, unknown>;
}