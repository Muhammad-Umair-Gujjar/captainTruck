import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { MediaErrorCode } from '../../common/constants/error-codes';
import { appHttpError } from '../../common/utils/http-error';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';

const ALLOWED_RESOURCE_TYPES = ['image', 'video', 'raw'] as const;
export type MediaResourceType = (typeof ALLOWED_RESOURCE_TYPES)[number];

/** Max upload size hint for clients (10 MB). */
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_FORMATS: Record<MediaResourceType, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  video: ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'mp4', 'webm'],
  raw: [],
};

@Injectable()
export class MediaService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  isConfigured(): boolean {
    const c = this.config.cloudinary;
    return Boolean(c.cloudName && c.apiKey && c.apiSecret);
  }

  /**
   * Signed params for direct client upload to Cloudinary.
   * Clients POST multipart to Cloudinary with these fields.
   */
  createUploadSignature(input?: {
    resourceType?: MediaResourceType;
    folder?: string;
  }) {
    this.assertConfigured();

    const resourceType = input?.resourceType ?? 'image';
    if (!ALLOWED_RESOURCE_TYPES.includes(resourceType)) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        MediaErrorCode.INVALID_TYPE,
        `resourceType must be one of: ${ALLOWED_RESOURCE_TYPES.join(', ')}`,
      );
    }

    const { cloudName, apiKey, apiSecret } = this.config.cloudinary;
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = (input?.folder ?? 'captain-truck').replace(
      /[^a-zA-Z0-9/_-]/g,
      '',
    );

    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder,
    };

    const allowed = ALLOWED_FORMATS[resourceType];
    if (allowed.length > 0) {
      paramsToSign.allowed_formats = allowed.join(',');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      apiSecret!,
    );

    return {
      cloudName: cloudName!,
      apiKey: apiKey!,
      timestamp,
      signature,
      folder,
      resourceType,
      allowedFormats: allowed,
      maxBytes: MEDIA_MAX_BYTES,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    };
  }

  /** Ensure mediaUrl is hosted on this project's Cloudinary account. */
  assertCloudinaryUrl(mediaUrl: string): void {
    this.assertConfigured();
    const cloudName = this.config.cloudinary.cloudName!;

    let parsed: URL;
    try {
      parsed = new URL(mediaUrl);
    } catch {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        MediaErrorCode.INVALID_URL,
        'mediaUrl must be a valid URL',
      );
    }

    if (parsed.protocol !== 'https:') {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        MediaErrorCode.INVALID_URL,
        'mediaUrl must use https',
      );
    }

    const hostOk =
      parsed.hostname === 'res.cloudinary.com' ||
      parsed.hostname.endsWith('.cloudinary.com');
    if (!hostOk) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        MediaErrorCode.INVALID_URL,
        'mediaUrl host must be Cloudinary',
      );
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments[0] !== cloudName) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        MediaErrorCode.INVALID_URL,
        'mediaUrl must belong to this Cloudinary cloud',
      );
    }
  }

  /**
   * Production: Cloudinary host allowlist.
   * Local/test without credentials: only `res.cloudinary.com/test-cloud/...`.
   */
  validateMediaUrl(mediaUrl: string): void {
    if (this.isConfigured()) {
      this.assertCloudinaryUrl(mediaUrl);
      return;
    }
    if (!/^https:\/\/res\.cloudinary\.com\/test-cloud\//.test(mediaUrl)) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        MediaErrorCode.INVALID_URL,
        'mediaUrl must be https://res.cloudinary.com/test-cloud/... when Cloudinary is not configured',
      );
    }
  }

  /**
   * Best-effort Cloudinary asset delete for retention cleanup.
   * Returns true if destroyed, not found, or Cloudinary not configured (local no-op).
   */
  async tryDeleteByUrl(mediaUrl: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return true;
    }

    const parsed = this.parseCloudinaryPublicId(mediaUrl);
    if (!parsed) return false;

    const { cloudName, apiKey, apiSecret } = this.config.cloudinary;
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    try {
      const raw: unknown = await cloudinary.uploader.destroy(parsed.publicId, {
        resource_type: parsed.resourceType,
        invalidate: true,
      });
      const status =
        typeof raw === 'object' &&
        raw !== null &&
        'result' in raw &&
        typeof raw.result === 'string'
          ? (raw as { result: string }).result
          : undefined;
      return status === 'ok' || status === 'not found';
    } catch {
      return false;
    }
  }

  private parseCloudinaryPublicId(mediaUrl: string): {
    publicId: string;
    resourceType: 'image' | 'video' | 'raw';
  } | null {
    try {
      const url = new URL(mediaUrl);
      const parts = url.pathname.split('/').filter(Boolean);
      // /{cloud}/{resource_type}/upload/[v123/]{public_id}.{ext}
      if (parts.length < 4) return null;
      const cloudName = this.config.cloudinary.cloudName;
      if (parts[0] !== cloudName) return null;

      const resourceType = parts[1] as 'image' | 'video' | 'raw';
      if (!['image', 'video', 'raw'].includes(resourceType)) return null;
      if (parts[2] !== 'upload' && parts[2] !== 'authenticated') return null;

      let rest = parts.slice(3);
      if (rest[0]?.startsWith('v') && /^v\d+$/.test(rest[0])) {
        rest = rest.slice(1);
      }
      if (rest.length === 0) return null;

      const last = rest[rest.length - 1];
      const withoutExt = last.replace(/\.[^.]+$/, '');
      rest = [...rest.slice(0, -1), withoutExt];
      return { publicId: rest.join('/'), resourceType };
    } catch {
      return null;
    }
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw appHttpError(
        HttpStatus.SERVICE_UNAVAILABLE,
        MediaErrorCode.NOT_CONFIGURED,
        'Cloudinary is not configured (set CLOUDINARY_* env vars)',
      );
    }
  }
}
