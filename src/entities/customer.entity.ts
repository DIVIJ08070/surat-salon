import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Gender } from '../common/enums';
import { Appointment } from './appointment.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'customer_code', type: 'varchar', length: 20, unique: true })
  customerCode!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 15, unique: true })
  phone!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email!: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender!: Gender;

  @Column({ type: 'date', nullable: true })
  dob!: Date;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Appointment, (apt) => apt.customer)
  appointments!: Appointment[];
}

