import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string | object;
  path: string;
  timestamp: string;
}

interface NestErrorResponse {
  message: string | string[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const res = exception instanceof HttpException ? exception.getResponse() : null;
    let message: string;

    if (typeof res === 'string') {
      message = res;
    } else if (res && typeof res === 'object' && 'message' in res) {
      const nestRes = res as NestErrorResponse;
      message = Array.isArray(nestRes.message)
        ? nestRes.message.join(', ')
        : nestRes.message;
    } else {
      message = exception.message || 'Internal server error';
    }

    this.logger.error(`${request.method} ${request.url}`, exception.stack);
    console.error('FULL ERROR:', exception);

    const errorBody: ErrorResponse = {
      success: false,
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorBody);
  }
}
