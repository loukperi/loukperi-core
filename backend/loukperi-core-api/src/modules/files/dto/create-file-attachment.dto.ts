import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFileAttachmentDto {
  @IsString()
  @MaxLength(255)
  file_name!: string;

  @IsString()
  @MaxLength(500)
  storage_key!: string;

  @IsMimeType()
  mime_type!: string;

  @IsInt()
  @Min(0)
  size_bytes!: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}