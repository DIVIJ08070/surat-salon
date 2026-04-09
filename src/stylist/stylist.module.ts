import { Module } from '@nestjs/common';
import { StylistService } from './stylist.service';
import { StylistController } from './stylist.controller';

@Module({
  controllers: [StylistController],
  providers: [StylistService],
  exports: [StylistService],
})
export class StylistModule {}
