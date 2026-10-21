import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      url: string;
    }>();

    const correlationId =
      request.headers['x-correlation-id'] ??
      request.headers['x-request-id'] ??
      null;

    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        data,
        meta: {
          path: request.url,
          timestamp: new Date().toISOString(),
          correlationId,
        },
      })),
    );
  }
}
