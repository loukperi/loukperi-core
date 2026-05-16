import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReplaceRolePermissionsDto {
  @ApiProperty({
    type: [String],
    example: [],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permission_ids!: string[];
}