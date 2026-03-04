import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

@UseGuards(JwtAuthGuard)
@Controller('api/v1/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /** List assets */
  @Get()
  list(
    @Request() req,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.mediaService.listAssets(req.user.tenantId, entityType, entityId);
  }

  /** Server-side upload */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File exceeds 10 MB limit');
    }

    const { key, url } = await this.mediaService.save(
      req.user.tenantId,
      file.originalname,
      file.buffer,
      file.mimetype,
    );

    return this.mediaService.createAsset(req.user.tenantId, {
      key,
      url,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      entityType,
      entityId,
    });
  }

  /** Presign URL for client-side direct upload (MinIO only) */
  @Post('presign')
  presign(
    @Request() req,
    @Body() body: { filename: string; contentType: string },
  ) {
    return this.mediaService.presignUpload(
      req.user.tenantId,
      body.filename,
      body.contentType,
    );
  }

  /** Delete asset */
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.mediaService.deleteAsset(req.user.tenantId, id);
    return { success: true };
  }
}
