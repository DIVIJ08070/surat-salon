import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bill } from 'src/entities';
import { BillService } from './bill.service';
import { BillController } from './bill.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Bill])],
  controllers: [BillController],
  providers: [BillService],
  exports: [BillService],
})
export class BillModule {}
