import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty()
  @IsUUID('4')
  user_id!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  type!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  entity_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  entity_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_read?: boolean;
}
