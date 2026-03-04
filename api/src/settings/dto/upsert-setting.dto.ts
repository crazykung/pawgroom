import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  key: string;

  @IsOptional()
  value: any;
}

export class BulkUpsertSettingsDto {
  @IsObject()
  settings: Record<string, any>;
}
