import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'test.user.002@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Test',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name!: string;

  @ApiProperty({
    example: 'User 002',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name!: string;

  @ApiPropertyOptional({
    example: '+306900000002',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    example: 'Support User',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  job_title?: string;

  @ApiPropertyOptional({
    description: 'Initial password. If omitted, ChangeMe123! is used.',
    example: 'ChangeMe123!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Role ids to assign to the workspace membership.',
    example: [],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  role_ids?: string[];
}