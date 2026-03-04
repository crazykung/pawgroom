import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { BulkUpsertSettingsDto, UpsertSettingDto } from './dto/upsert-setting.dto';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAll(@Request() req) {
    return this.settingsService.getAll(req.user.tenantId);
  }

  @Get(':key')
  get(@Request() req, @Param('key') key: string) {
    return this.settingsService.get(req.user.tenantId, key).then((value) => ({
      key,
      value,
    }));
  }

  @Put()
  bulkSet(@Request() req, @Body() dto: BulkUpsertSettingsDto) {
    return this.settingsService
      .bulkSet(req.user.tenantId, dto.settings)
      .then(() => ({ success: true }));
  }

  @Put(':key')
  set(@Request() req, @Param('key') key: string, @Body() dto: UpsertSettingDto) {
    return this.settingsService
      .set(req.user.tenantId, key, dto.value)
      .then(() => ({ key, value: dto.value }));
  }

  @Delete(':key')
  delete(@Request() req, @Param('key') key: string) {
    return this.settingsService
      .delete(req.user.tenantId, key)
      .then(() => ({ success: true }));
  }
}
