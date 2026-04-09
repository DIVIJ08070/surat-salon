import { Module } from '@nestjs/common';
import { StylistLeaveService } from './stylist-leave.service';
import { StylistLeaveController } from './stylist-leave.controller';

@Module({
  controllers: [StylistLeaveController],
  providers: [StylistLeaveService],
})
export class StylistLeaveModule {}
