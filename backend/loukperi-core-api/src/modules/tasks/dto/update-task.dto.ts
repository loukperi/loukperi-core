import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ enum: ['open', 'in_progress', 'blocked', 'completed', 'cancelled'] })
  @IsOptional()
  @IsIn(['open', 'in_progress', 'blocked', 'completed', 'cancelled'])
  status?: 'open' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
}
