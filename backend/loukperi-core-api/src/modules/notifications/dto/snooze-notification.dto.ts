import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class SnoozeNotificationDto {
  @ApiPropertyOptional({
    example: '2026-06-04T09:00:00.000Z',
    description: 'ISO date/time until which the notification should be hidden.',
  })
  @IsOptional()
  @IsDateString()
  snoozed_until?: string;

  @ApiPropertyOptional({
    example: '2026-06-04T09:00:00.000Z',
    description: 'CamelCase alias accepted by the API.',
  })
  @IsOptional()
  @IsDateString()
  snoozedUntil?: string;
}
