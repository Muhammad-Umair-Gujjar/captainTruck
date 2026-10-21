import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { OsmErrorCode } from '../../common/constants/error-codes';
import { appHttpError } from '../../common/utils/http-error';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';

export type OsrmRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
};

/**
 * OSRM public demo client with timeout + simple circuit breaker.
 * Failures never crash the process — they throw typed HTTP errors.
 */
@Injectable()
export class OsrmService {
  private readonly logger = new Logger(OsrmService.name);
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;
  private readonly failureThreshold = 5;
  private readonly circuitMs = 30_000;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async getRoutes(
    fromLng: number,
    fromLat: number,
    toLng: number,
    toLat: number,
  ): Promise<OsrmRouteResult[]> {
    this.assertCircuitClosed();

    const base = this.config.osm.osrmBaseUrl.replace(/\/$/, '');
    const url =
      `${base}/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=full&geometries=polyline&alternatives=true`;

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.osm.timeoutMs,
    );

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': this.config.osm.userAgent },
      });

      if (!res.ok) {
        this.recordFailure();
        throw appHttpError(
          HttpStatus.SERVICE_UNAVAILABLE,
          OsmErrorCode.UNAVAILABLE,
          'Routing service unavailable',
          { status: res.status },
        );
      }

      const body = (await res.json()) as {
        code?: string;
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: string;
        }>;
      };

      if (body.code !== 'Ok' || !body.routes?.length) {
        this.recordSuccess();
        throw appHttpError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OsmErrorCode.NO_ROUTE,
          'No driving route found between the given points',
        );
      }

      const maxChars = this.config.osm.polylineMaxChars;
      const routes = body.routes.slice(0, 3).map((r) => {
        const polyline = r.geometry ?? '';
        if (polyline.length > maxChars) {
          throw appHttpError(
            HttpStatus.PAYLOAD_TOO_LARGE,
            OsmErrorCode.POLYLINE_TOO_LARGE,
            'Route polyline exceeds size limit',
            { length: polyline.length, maxChars },
          );
        }
        return {
          distanceMeters: Math.round(r.distance),
          durationSeconds: Math.round(r.duration),
          polyline,
        };
      });

      this.recordSuccess();
      return routes;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'getStatus' in error &&
        typeof (error as { getStatus: () => number }).getStatus === 'function'
      ) {
        throw error;
      }

      this.recordFailure();
      const aborted =
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('aborted'));

      if (aborted) {
        throw appHttpError(
          HttpStatus.GATEWAY_TIMEOUT,
          OsmErrorCode.TIMEOUT,
          'Routing service timed out',
        );
      }

      this.logger.warn(
        `OSRM request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw appHttpError(
        HttpStatus.SERVICE_UNAVAILABLE,
        OsmErrorCode.UNAVAILABLE,
        'Routing service unavailable',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private assertCircuitClosed() {
    if (Date.now() < this.circuitOpenUntil) {
      throw appHttpError(
        HttpStatus.SERVICE_UNAVAILABLE,
        OsmErrorCode.UNAVAILABLE,
        'Routing circuit open; retry shortly',
        {
          retryAfterSeconds: Math.ceil(
            (this.circuitOpenUntil - Date.now()) / 1000,
          ),
        },
      );
    }
  }

  private recordFailure() {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.circuitOpenUntil = Date.now() + this.circuitMs;
      this.consecutiveFailures = 0;
      this.logger.warn('OSRM circuit opened');
    }
  }

  private recordSuccess() {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
  }
}
