import {
  Controller, Get, Put, Delete, Body, Param, UseGuards, Request,
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
    return this.settingsService.getAll(req.user.branchId);
  }

  @Get(':key')
  async get(@Request() req, @Param('key') key: string) {
    const value = await this.settingsService.get(req.user.branchId, key);
    return { key, value };
  }

  @Put()
  async bulkSet(@Request() req, @Body() dto: BulkUpsertSettingsDto) {
    await this.settingsService.bulkSet(req.user.branchId, dto.settings);
    return { success: true };
  }

  @Put(':key')
  async set(@Request() req, @Param('key') key: string, @Body() dto: UpsertSettingDto) {
    await this.settingsService.set(req.user.branchId, key, dto.value);
    return { key, value: dto.value };
  }

  @Delete(':key')
  async delete(@Request() req, @Param('key') key: string) {
    await this.settingsService.delete(req.user.branchId, key);
    return { success: true };
  }
}
