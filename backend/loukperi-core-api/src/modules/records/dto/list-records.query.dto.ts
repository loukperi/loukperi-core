import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PriorityEnum } from 'src/common/enums/priority.enum';

export class ListRecordsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  record_type_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  status_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  assignee_user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  owner_user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  account_id?: string;

  @ApiPropertyOptional({ enum: PriorityEnum })
  @IsOptional()
  @IsEnum(PriorityEnum)
  priority?: PriorityEnum;

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
  @IsUUID('4')
  saved_view_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;
}
