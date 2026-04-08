import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: number;
    userId?: number;
  };
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor<unknown, unknown> {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<AuthenticatedRequest>();
    
    let userIdStr = 'Anonymous';
    if (request.user) {
      if (request.user.id) {
        userIdStr = String(request.user.id);
      } else if (request.user.userId) {
        userIdStr = String(request.user.userId);
      }
    }
    
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log(`[Method: ${method}] [URL: ${url}] [User: ${userIdStr}] - ${responseTime}ms`);
      }),
    );
  }
}
