import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'client_admin' })
  @IsString()
  @Matches(/^[a-z0-9_]+$/)
  @MaxLength(60)
  code!: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
