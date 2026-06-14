import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateRecordDto {
  @IsOptional()
  @IsString()
  record_type_id?: string;

  @IsOptional()
  @IsString()
  account_id?: string;

  @IsOptional()
  @IsString()
  contact_id?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status_id?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  owner_user_id?: string;

  @IsOptional()
  @IsString()
  assignee_user_id?: string;

  @IsOptional()
  @IsDateString()
  opened_at?: string;

  @IsOptional()
  @IsDateString()
  due_at?: string;

  @IsOptional()
  @IsDateString()
  closed_at?: string;

  @IsOptional()
  @IsString()
  source_system?: string;

  @IsOptional()
  @IsString()
  source_external_id?: string;

  @IsOptional()
  @IsString()
  source_url?: string;

  @IsOptional()
  @IsObject()
  data_jsonb?: Record<string, unknown>;

  /**
   * Frontend-friendly aliases.
   * Τα κρατάμε για να μην απορρίπτει το ValidationPipe τα payloads του frontend.
   * Το service μπορεί να τα χαρτογραφήσει στα πραγματικά backend fields.
   */
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsIn(['Open', 'In Progress', 'Done'])
  status?: 'Open' | 'In Progress' | 'Done';

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}