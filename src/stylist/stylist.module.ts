import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stylist } from 'src/entities';
import { StylistService } from './stylist.service';
import { StylistController } from './stylist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Stylist])],
  controllers: [StylistController],
  providers: [StylistService],
  exports: [StylistService],
})
export class StylistModule {}
