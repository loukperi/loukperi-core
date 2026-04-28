import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString, IsUrl, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PriorityEnum } from 'src/common/enums/priority.enum';

export class CreateRecordDto {
  @ApiProperty()
  @IsUUID('4')
  record_type_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  account_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  contact_id?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  status_id?: string;

  @ApiPropertyOptional({ enum: PriorityEnum, default: PriorityEnum.MEDIUM })
  @IsOptional()
  @IsEnum(PriorityEnum)
  priority?: PriorityEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  owner_user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  assignee_user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  opened_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source_system?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source_external_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  source_url?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  data_jsonb?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  custom_fields?: Record<string, unknown>;
}
