import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';

/**
 * Ensures 429 responses include Retry-After and our standard error envelope.
 * Rate-limit storage is in-memory for Phase 1 (fail-open if process restarts).
 * Redis-backed throttling arrives with Phase 10; policy: fail-open with warning
 * for general routes when Redis is down (FYP demo); auth routes may fail-closed later.
 */
@Catch(ThrottlerException)
export class ThrottleExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const retryAfterSeconds = 60;
    response.setHeader('Retry-After', String(retryAfterSeconds));

    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? null;

    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: exception.message || 'Too many requests',
        details: { retryAfterSeconds },
      },
      meta: {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        path: request.url,
        timestamp: new Date().toISOString(),
        correlationId,
      },
    });
  }
}
