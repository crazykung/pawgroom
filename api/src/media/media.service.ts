import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3: S3Client | null = null;
  private readonly driver: string;
  private readonly bucket: string;
  private readonly uploadDir: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.driver = config.get('STORAGE_DRIVER', 'local');
    this.bucket = config.get('MINIO_BUCKET', 'pawgroom');
    this.uploadDir = config.get('UPLOAD_DIR', '/var/lib/pawgroom/uploads');

    if (this.driver === 'minio') {
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

  /** Generate a presigned upload URL (for client-side direct upload) */
  async presignUpload(
    tenantId: string,
    filename: string,
    contentType: string,
    expiresIn = 300,
  ) {
    if (this.driver !== 'minio') {
      throw new BadRequestException('Presigned upload requires MinIO driver');
    }

    const ext = path.extname(filename);
    const key = `${tenantId}/${crypto.randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3!, command, { expiresIn });
    return { uploadUrl: url, key };
  }

  /** Save a file buffer (for server-side uploads) */
  async save(
    tenantId: string,
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ key: string; url: string }> {
    const ext = path.extname(filename);
    const key = `${tenantId}/${crypto.randomUUID()}${ext}`;

    if (this.driver === 'minio') {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } else {
      const dest = path.join(this.uploadDir, key);
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await fs.promises.writeFile(dest, buffer);
    }

    const url = this.getPublicUrl(key);
    return { key, url };
  }

  /** Record asset in DB */
  async createAsset(
    tenantId: string,
    data: {
      key: string;
      originalName: string;
      mimeType: string;
      size: number;
      url: string;
      entityType?: string;
      entityId?: string;
    },
  ) {
    return this.prisma.mediaAsset.create({
      data: {
        tenantId,
        ...data,
        driver: this.driver,
      },
    });
  }

  async delete(key: string): Promise<void> {
    if (this.driver === 'minio') {
      await this.s3!.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } else {
      const filePath = path.join(this.uploadDir, key);
      await fs.promises.unlink(filePath).catch(() => {
        this.logger.warn(`File not found for deletion: ${filePath}`);
      });
    }
  }

  getPublicUrl(key: string): string {
    if (this.driver === 'minio') {
      const endpoint = this.config.get('MINIO_PUBLIC_URL', '');
      return `${endpoint}/${this.bucket}/${key}`;
    }
    const domain = this.config.get('DOMAIN', 'localhost');
    return `https://${domain}/uploads/${key}`;
  }

  async listAssets(tenantId: string, entityType?: string, entityId?: string) {
    return this.prisma.mediaAsset.findMany({
      where: {
        tenantId,
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAsset(tenantId: string, assetId: string): Promise<void> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: assetId, tenantId },
    });
    if (!asset) return;

    await this.delete(asset.key);
    await this.prisma.mediaAsset.delete({ where: { id: assetId } });
  }
}
