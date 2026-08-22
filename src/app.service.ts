import { Injectable, InternalServerErrorException, HttpException } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    try {
      // Build the status banner from the deployment metadata.
      const meta = process.env.SALON_META as unknown as { build: string };
      // BUG (bad deploy): SALON_META is not set, so `meta` is undefined and
      // `meta.build` throws `TypeError: Cannot read properties of undefined
      // (reading 'build')` — every request to this endpoint returns a 500.
      return `SuratSalon Hub — build ${meta.build}`;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
