import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PriorityEnum } from 'src/common/enums/priority.enum';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Επικοινωνία με πελάτη',
    minLength: 2,
    maxLength: 180,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Να γίνει follow-up για την προσφορά.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  /**
   * Backwards compatibility:
   * Αν κάποιο παλιότερο σημείο του backend/frontend στέλνει ακόμα description,
   * το αφήνουμε προσωρινά για να μη σπάσει το request.
   * Προτεινόμενο field από εδώ και πέρα: notes.
   */
  @ApiPropertyOptional({
    nullable: true,
    deprecated: true,
    example: 'Legacy field. Use notes instead.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({
    enum: PriorityEnum,
    default: PriorityEnum.MEDIUM,
  })
  @IsOptional()
  @IsEnum(PriorityEnum)
  priority?: PriorityEnum;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Ο χρήστης στον οποίο έχει ανατεθεί το task. Null = χωρίς ανάθεση.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4')
  assignee_user_id?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'customer',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  related_entity_type?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4')
  related_entity_id?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-06-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  due_at?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-06-14T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  reminder_at?: string | null;
}
