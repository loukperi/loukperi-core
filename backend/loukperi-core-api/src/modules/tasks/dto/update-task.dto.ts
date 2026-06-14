import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({
    enum: ['open', 'in_progress', 'blocked', 'completed', 'cancelled'],
    example: 'open',
  })
  @IsOptional()
  @IsIn(['open', 'in_progress', 'blocked', 'completed', 'cancelled'])
  status?: 'open' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
}
