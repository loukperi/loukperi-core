import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['invited', 'active', 'suspended'] })
  @IsOptional()
  @IsIn(['invited', 'active', 'suspended'])
  status?: 'invited' | 'active' | 'suspended';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;
}
