import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

interface HttpExceptionResponse {
  message?: string | string[];
}

function isHttpExceptionResponse(obj: unknown): obj is HttpExceptionResponse {
  return typeof obj === 'object' && obj !== null;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (isHttpExceptionResponse(exceptionResponse)) {
        if (Array.isArray(exceptionResponse.message)) {
          message = exceptionResponse.message.join(', ');
        } else if (typeof exceptionResponse.message === 'string') {
          message = exceptionResponse.message;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // Retain true error message for non-http exceptions to aide debugging
      message = exception.message;
    }

    const errorResponse = {
      success: false,
      message,
      statusCode: status,
    };

    response.status(status).json(errorResponse);
  }
}
