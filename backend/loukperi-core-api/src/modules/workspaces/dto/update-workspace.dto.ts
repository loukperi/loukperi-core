import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsHexColor, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  company_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logo_url?: string;

  @ApiPropertyOptional({ example: '#0B1F3A' })
  @IsOptional()
  @IsHexColor()
  primary_color?: string;

  @ApiPropertyOptional({ example: '#3A8DFF' })
  @IsOptional()
  @IsHexColor()
  secondary_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
