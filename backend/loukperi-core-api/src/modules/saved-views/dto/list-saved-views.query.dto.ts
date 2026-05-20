import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListSavedViewsQueryDto {
  @ApiPropertyOptional({
    example: 'record',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  entity_type?: string;

  @ApiPropertyOptional({
    enum: ['private', 'workspace', 'public'],
  })
  @IsOptional()
  @IsIn(['private', 'workspace', 'public'])
  visibility?: string;
}