import { Injectable, InternalServerErrorException, HttpException } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    try {
      const info: { region: string } | undefined = undefined;
      // BUG: info is undefined → TypeError on .region → 500 on GET /v1
      return `SuratSalon Hub — ${info!.region}`;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
