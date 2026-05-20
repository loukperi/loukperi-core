import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListDashboardsQueryDto {
  @ApiPropertyOptional({
    example: 'workspace',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  scope_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  scope_id?: string;
}