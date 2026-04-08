import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuthUser } from 'src/auth/jwt.stratergy';

interface RequestWithUser extends Request {
  user?: AuthUser;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<object> {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const { method, url } = request;
    const userId = request.user?.user_id ?? 'unauthenticated';
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        this.logger.log(`${method} ${url} | user: ${userId} | ${responseTime}ms`);
      }),
    );
  }
}
