import { Injectable, InternalServerErrorException, HttpException } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    try {
      return 'Hello World!';
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
