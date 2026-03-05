import {
  Controller, Post, Delete, Get, Param, Query, Body,
  UploadedFile, UseInterceptors, UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';
import { MediaAssetType } from '@prisma/client';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024;

@UseGuards(JwtAuthGuard)
@Controller('api/v1/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  list(@Request() req) {
    return this.mediaService.listAssets(req.user.branchId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIME.includes(file.mimetype)) throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
    if (file.size > MAX_SIZE) throw new BadRequestException('File exceeds 10 MB limit');

    const { objectKey, publicUrl } = await this.mediaService.save(
      req.user.branchId, file.originalname, file.buffer, file.mimetype,
    );

    return this.mediaService.createAsset(req.user.branchId, {
      objectKey,
      publicUrl,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      type: (type as MediaAssetType) ?? MediaAssetType.photo,
    });
  }

  @Post('presign')
  presign(@Request() req, @Body() body: { filename: string; contentType: string }) {
    return this.mediaService.presignUpload(req.user.branchId, body.filename, body.contentType);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.mediaService.deleteAsset(req.user.branchId, id);
    return { success: true };
  }
}
