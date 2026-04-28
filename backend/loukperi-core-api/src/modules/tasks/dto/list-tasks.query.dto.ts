import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PriorityEnum } from 'src/common/enums/priority.enum';

export class ListTasksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['my', 'team', 'all'] })
  @IsOptional()
  @IsIn(['my', 'team', 'all'])
  scope?: 'my' | 'team' | 'all';

  @ApiPropertyOptional({ enum: ['open', 'in_progress', 'blocked', 'completed', 'cancelled'] })
  @IsOptional()
  @IsIn(['open', 'in_progress', 'blocked', 'completed', 'cancelled'])
  status?: 'open' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

  @ApiPropertyOptional({ enum: PriorityEnum })
  @IsOptional()
  @IsEnum(PriorityEnum)
  priority?: PriorityEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  assignee_user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  related_entity_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  related_entity_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_before?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_after?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;
}
