import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ServiceCategory, Gender } from '../common/enums';
import { AppointmentService } from './appointment-service.entity';
import { StylistService } from './stylist-service.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'service_code', type: 'varchar', length: 20, unique: true })
  serviceCode!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'enum', enum: ServiceCategory })
  category!: ServiceCategory;

  @Column({ name: 'duration_minutes', type: 'smallint', unsigned: true })
  durationMinutes!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'enum', enum: Gender, default: Gender.UNISEX })
  gender!: Gender;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'is_available', type: 'tinyint', width: 1, default: 1 })
  isAvailable!: number;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => StylistService, (ss) => ss.service)
  stylistServices!: StylistService[];

  @OneToMany(() => AppointmentService, (as) => as.service)
  appointmentServices!: AppointmentService[];
}
