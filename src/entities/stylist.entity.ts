import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { StylistSpecialisation, StylistStatus } from '../common/enums';
import { StylistService } from './stylist-service.entity';
import { TimeSlot } from './time-slot.entity';
import { Appointment } from './appointment.entity';
import { StylistLeave } from './stylist-leave.entity';

@Entity('stylists')
export class Stylist {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'enum', enum: StylistSpecialisation })
  specialisation!: StylistSpecialisation;

  @Column({ name: 'working_days', type: 'varchar', length: 50 })
  workingDays!: string;

  @Column({ name: 'shift_start', type: 'time' })
  shiftStart!: string;

  @Column({ name: 'shift_end', type: 'time' })
  shiftEnd!: string;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 0.00 })
  commissionRate!: number;

  @Column({ name: 'stylist_status', type: 'enum', enum: StylistStatus, default: StylistStatus.ACTIVE })
  stylistStatus!: StylistStatus;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => StylistService, (ss) => ss.stylist)
  stylistServices!: StylistService[];

  @OneToMany(() => TimeSlot, (ts) => ts.stylist)
  timeSlots!: TimeSlot[];

  @OneToMany(() => Appointment, (apt) => apt.stylist)
  appointments!: Appointment[];

  @OneToMany(() => StylistLeave, (sl) => sl.stylist)
  leaves!: StylistLeave[];
}
