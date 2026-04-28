import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO4217CurrencyCode, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateWorkspaceSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  default_record_label_singular?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  default_record_label_plural?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date_format?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  number_format?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  features_jsonb?: Record<string, unknown>;
}
