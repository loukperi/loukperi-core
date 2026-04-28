import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateRecordDto } from './create-record.dto';

export class UpdateRecordDto extends PartialType(CreateRecordDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  closed_at?: string;
}
