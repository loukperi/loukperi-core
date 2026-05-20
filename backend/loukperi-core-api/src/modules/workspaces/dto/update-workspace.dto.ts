import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({
    example: 'Demo Client',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    example: 'Demo Client SA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  company_name?: string;

  @ApiPropertyOptional({
    example: 'Europe/Athens',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional({
    example: 'el-GR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({
    example: '#0B1F3A',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'primary_color must be a valid hex color',
  })
  primary_color?: string;

  @ApiPropertyOptional({
    example: '#3A8DFF',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'secondary_color must be a valid hex color',
  })
  secondary_color?: string;

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}