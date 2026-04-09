import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeSlot } from 'src/entities';
import { TimeSlotService } from './time-slot.service';
import { TimeSlotController } from './time-slot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TimeSlot])],
  controllers: [TimeSlotController],
  providers: [TimeSlotService],
  exports: [TimeSlotService],  // exported so AppointmentsModule can use getAvailableSlots()
})
export class TimeSlotModule {}
