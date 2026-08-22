import { Injectable, InternalServerErrorException, HttpException } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    try {
      // Parse the feature-flags blob for the status endpoint.
      const raw = process.env.SALON_FLAGS as string;
      // BUG: SALON_FLAGS is unset → JSON.parse(undefined) throws
      // 'Unexpected token u in JSON' → every GET /v1 returns a 500.
      const flags = JSON.parse(raw) as { build: string };
      return `SuratSalon Hub — build ${flags.build}`;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
