import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { OsmErrorCode } from '../../common/constants/error-codes';
import { appHttpError } from '../../common/utils/http-error';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  /** Nominatim search — prefer client-provided map pins when available. */
  async geocodeAddress(query: string): Promise<GeocodeResult> {
    const base = this.config.osm.nominatimBaseUrl.replace(/\/$/, '');
    const url = new URL(`${base}/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'pk');

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.osm.timeoutMs,
    );

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.osm.userAgent,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw appHttpError(
          HttpStatus.SERVICE_UNAVAILABLE,
          OsmErrorCode.GEOCODE_FAILED,
          'Geocoding service unavailable',
        );
      }

      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (!data.length) {
        throw appHttpError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OsmErrorCode.GEOCODE_FAILED,
          `Could not geocode address: ${query}`,
        );
      }

      return {
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
        displayName: data[0].display_name,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'getStatus' in error &&
        typeof (error as { getStatus: () => number }).getStatus === 'function'
      ) {
        throw error;
      }
      this.logger.warn(
        `Geocode failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw appHttpError(
        HttpStatus.SERVICE_UNAVAILABLE,
        OsmErrorCode.GEOCODE_FAILED,
        'Geocoding service unavailable',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /** Photon autocomplete proxy (throttled at controller). */
  async autocomplete(query: string, limit = 5): Promise<GeocodeResult[]> {
    const base = this.config.osm.photonBaseUrl.replace(/\/$/, '');
    const url = new URL(`${base}/api`);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(Math.min(limit, 10)));
    url.searchParams.set('lang', 'en');

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.osm.timeoutMs,
    );

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': this.config.osm.userAgent },
      });
      if (!res.ok) {
        throw appHttpError(
          HttpStatus.SERVICE_UNAVAILABLE,
          OsmErrorCode.GEOCODE_FAILED,
          'Autocomplete service unavailable',
        );
      }

      const body = (await res.json()) as {
        features?: Array<{
          geometry: { coordinates: [number, number] };
          properties: { name?: string; city?: string; country?: string };
        }>;
      };

      return (body.features ?? []).map((f) => ({
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        displayName: [
          f.properties.name,
          f.properties.city,
          f.properties.country,
        ]
          .filter(Boolean)
          .join(', '),
      }));
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'getStatus' in error &&
        typeof (error as { getStatus: () => number }).getStatus === 'function'
      ) {
        throw error;
      }
      throw appHttpError(
        HttpStatus.SERVICE_UNAVAILABLE,
        OsmErrorCode.GEOCODE_FAILED,
        'Autocomplete service unavailable',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
