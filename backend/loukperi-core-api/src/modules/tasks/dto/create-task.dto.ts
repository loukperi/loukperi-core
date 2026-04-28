import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PriorityEnum } from 'src/common/enums/priority.enum';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: PriorityEnum, default: PriorityEnum.MEDIUM })
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
  @MaxLength(50)
  related_entity_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  related_entity_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reminder_at?: string;
}
