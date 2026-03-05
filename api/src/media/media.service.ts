import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageDriver, MediaAssetType } from '@prisma/client';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3: S3Client | null = null;
  private readonly driver: StorageDriver;
  private readonly bucket: string;
  private readonly uploadDir: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const driverStr = config.get('STORAGE_DRIVER', 'local');
    this.driver = driverStr as StorageDriver;
    this.bucket = config.get('MINIO_BUCKET', 'pawgroom');
    this.uploadDir = config.get('UPLOAD_DIR', '/var/lib/pawgroom/uploads');

    if (this.driver === StorageDriver.minio) {
      this.s3 = new S3Client({
        endpoint: config.get('MINIO_ENDPOINT', 'http://minio:9000'),
        region: 'ap-southeast-1',
        credentials: {
          accessKeyId: config.get('MINIO_ACCESS_KEY', ''),
          secretAccessKey: config.get('MINIO_SECRET_KEY', ''),
        },
        forcePathStyle: true,
      });
    }
  }

  async presignUpload(branchId: string, filename: string, contentType: string, expiresIn = 300) {
    if (this.driver !== StorageDriver.minio) {
      throw new BadRequestException('Presigned upload requires MinIO driver');
    }
    const ext = path.extname(filename);
    const objectKey = `${branchId}/${crypto.randomUUID()}${ext}`;
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.s3!, command, { expiresIn });
    return { uploadUrl, objectKey };
  }

  async save(branchId: string, filename: string, buffer: Buffer, contentType: string) {
    const ext = path.extname(filename);
    const objectKey = `${branchId}/${crypto.randomUUID()}${ext}`;

    if (this.driver === StorageDriver.minio) {
      await this.s3!.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      }));
    } else {
      const dest = path.join(this.uploadDir, objectKey);
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await fs.promises.writeFile(dest, buffer);
    }

    const publicUrl = this.getPublicUrl(objectKey);
    return { objectKey, publicUrl };
  }

  async createAsset(branchId: string, data: {
    objectKey: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    publicUrl?: string;
    type?: MediaAssetType;
    bucket?: string;
    localPath?: string;
  }) {
    return this.prisma.mediaAsset.create({
      data: {
        branchId,
        driver: this.driver,
        bucket: this.driver === StorageDriver.minio ? this.bucket : undefined,
        type: data.type ?? MediaAssetType.photo,
        filename: data.filename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        objectKey: data.objectKey,
        publicUrl: data.publicUrl,
        localPath: data.localPath,
      },
    });
  }

  async deleteByObjectKey(objectKey: string): Promise<void> {
    if (this.driver === StorageDriver.minio) {
      await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    } else {
      const filePath = path.join(this.uploadDir, objectKey);
      await fs.promises.unlink(filePath).catch(() => {
        this.logger.warn(`File not found: ${filePath}`);
      });
    }
  }

  getPublicUrl(objectKey: string): string {
    if (this.driver === StorageDriver.minio) {
      const endpoint = this.config.get('MINIO_PUBLIC_URL', '');
      return `${endpoint}/${this.bucket}/${objectKey}`;
    }
    const domain = this.config.get('DOMAIN', 'localhost');
    return `https://${domain}/uploads/${objectKey}`;
  }

  async listAssets(branchId: string) {
    return this.prisma.mediaAsset.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAsset(branchId: string, assetId: string): Promise<void> {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, branchId } });
    if (!asset) return;
    if (asset.objectKey) await this.deleteByObjectKey(asset.objectKey);
    await this.prisma.mediaAsset.delete({ where: { id: assetId } });
  }
}
