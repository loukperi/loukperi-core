import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignRecordDto {
  @ApiProperty()
  @IsUUID('4')
  assignee_user_id!: string;
}
