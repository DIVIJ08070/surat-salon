import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AppointmentServiceStatus } from '../common/enums';
import { Appointment } from './appointment.entity';
import { Service } from './service.entity';

@Entity('appointment_services')
export class AppointmentService {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'appointment_id' })
  appointmentId!: number;

  @Column({ name: 'service_id' })
  serviceId!: number;

  @Column({ name: 'price_at_booking', type: 'decimal', precision: 10, scale: 2 })
  priceAtBooking!: number;

  @Column({ name: 'duration_minutes', type: 'smallint', unsigned: true })
  durationMinutes!: number;

  @Column({ name: 'appointment_service_status', type: 'enum', enum: AppointmentServiceStatus, default: AppointmentServiceStatus.PENDING })
  appointmentServiceStatus!: AppointmentServiceStatus;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Appointment, (apt) => apt.appointmentServices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;

  @ManyToOne(() => Service, (service) => service.appointmentServices)
  @JoinColumn({ name: 'service_id' })
  service!: Service;
}
