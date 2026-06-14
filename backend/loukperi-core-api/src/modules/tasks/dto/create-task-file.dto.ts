import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateTaskFileDto {
  @ApiProperty({ example: 'offer.pdf', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  file_name!: string;

  @ApiPropertyOptional({ example: 'application/pdf', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mime_type?: string;

  @ApiPropertyOptional({ example: 248912 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1024 * 1024 * 1024)
  size_bytes?: number;

  @ApiPropertyOptional({
    description: 'Future storage key/path when real file upload is connected.',
    example: 'tasks/uuid/offer.pdf',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  storage_key?: string | null;
}
