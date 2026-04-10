import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';

import { TimeSlotModule } from 'src/time-slot/time-slot.module';

@Module({
  imports: [ScheduleModule.forRoot(), TimeSlotModule],
  providers: [CronService],
})
export class CronModule {}
