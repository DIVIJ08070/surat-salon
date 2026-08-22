import { Injectable, InternalServerErrorException, HttpException } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    try {
      // Pick the current release channel for the status banner.
      const channels: string[] = [];
      // BUG: channels is empty → channels[0] is undefined →
      // .toUpperCase() throws a TypeError → every GET /v1 returns 500.
      return `SuratSalon Hub — ${channels[0].toUpperCase()} channel`;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
