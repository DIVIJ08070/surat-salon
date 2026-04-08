import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SlotStatus, BlockReason } from '../common/enums';
import { Stylist } from './stylist.entity';
import { Appointment } from './appointment.entity';

@Entity('time_slots')
export class TimeSlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'stylist_id' })
  stylistId!: number;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId!: number;

  @Column({ name: 'slot_date', type: 'date' })
  slotDate!: Date;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @Column({ name: 'slot_status', type: 'enum', enum: SlotStatus, default: SlotStatus.AVAILABLE })
  slotStatus!: SlotStatus;

  @Column({ name: 'block_reason', type: 'enum', enum: BlockReason, nullable: true })
  blockReason!: BlockReason;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Stylist, (s) => s.timeSlots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stylist_id' })
  stylist!: Stylist;

  @ManyToOne(() => Appointment, (apt) => apt.timeSlots, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;
}
