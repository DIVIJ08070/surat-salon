import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';
import { ApiSuccessResponse } from '../types/api-response.types';

@Injectable()
export class SuccessInterceptor implements NestInterceptor {
  intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse> {
    const response = ctx.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map(
        (data: object): ApiSuccessResponse => ({
          success: true,
          statusCode: response.statusCode ?? 200,
          message: 'success',
          data: data ?? null,
          timestamp: new Date().toISOString(),
        }),
      ),
    );
  }
}
