import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTagDto {
  @ApiProperty()
  @IsUUID('4')
  tag_id!: string;
}
