import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { PaymentMethod, BillStatus } from '../common/enums';
import { Appointment } from './appointment.entity';

@Entity('bills')
export class Bill {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'appointment_id' })
  appointmentId!: number;

  @Column({ name: 'bill_number', type: 'varchar', length: 20, unique: true })
  billNumber!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  discount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  tax!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'bill_status', type: 'enum', enum: BillStatus, default: BillStatus.PENDING })
  billStatus!: BillStatus;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt!: Date;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => Appointment, (apt) => apt.bill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;
}
