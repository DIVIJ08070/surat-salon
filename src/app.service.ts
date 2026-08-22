import { Injectable, InternalServerErrorException, HttpException } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    try {
      // Report the live salon status on the health/root endpoint.
      const status: { name: string; version: string } | undefined = undefined;
      // BUG (bad deploy): `status` is undefined — dereferencing `.name` throws
      // `TypeError: Cannot read properties of undefined (reading 'name')`, so
      // every request to this endpoint returns a 500.
      return `SuratSalon Hub — ${status!.name} v${status!.version}`;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
