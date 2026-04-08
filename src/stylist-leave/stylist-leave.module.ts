import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StylistLeave } from 'src/entities';
import { StylistLeaveService } from './stylist-leave.service';
import { StylistLeaveController } from './stylist-leave.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StylistLeave])],
  controllers: [StylistLeaveController],
  providers: [StylistLeaveService],
  exports: [StylistLeaveService],
})
export class StylistLeaveModule {}
