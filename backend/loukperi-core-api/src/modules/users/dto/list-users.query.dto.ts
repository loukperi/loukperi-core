import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'test',
    description: 'Search by email, first name, or last name.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['active', 'inactive', 'invited', 'suspended'],
    example: 'active',
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'invited', 'suspended'])
  status?: string;
}