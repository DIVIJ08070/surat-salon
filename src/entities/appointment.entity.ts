import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AppointmentStatus } from '../common/enums';
import { Customer } from './customer.entity';
import { Stylist } from './stylist.entity';
import { AppointmentService } from './appointment-service.entity';
import { TimeSlot } from './time-slot.entity';
import { Bill } from './bill.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'appointment_number', type: 'varchar', length: 20, unique: true })
  appointmentNumber!: string;

  @Column({ name: 'customer_id' })
  customerId!: number;

  @Column({ name: 'stylist_id' })
  stylistId!: number;

  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate!: Date;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @Column({ name: 'total_duration_minutes', type: 'smallint', unsigned: true })
  totalDurationMinutes!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({ name: 'appointment_status', type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  appointmentStatus!: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Customer, (c) => c.appointments)
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @ManyToOne(() => Stylist, (s) => s.appointments)
  @JoinColumn({ name: 'stylist_id' })
  stylist!: Stylist;

  @OneToMany(() => AppointmentService, (as) => as.appointment)
  appointmentServices!: AppointmentService[];

  @OneToMany(() => TimeSlot, (ts) => ts.appointment)
  timeSlots!: TimeSlot[];

  @OneToOne(() => Bill, (b) => b.appointment)
  bill!: Bill;
}
