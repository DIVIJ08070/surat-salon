import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LeaveStatus } from '../common/enums';
import { Stylist } from './stylist.entity';

@Entity('stylist_leaves')
export class StylistLeave {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'stylist_id' })
  stylistId!: number;

  @Column({ name: 'leave_date', type: 'date' })
  leaveDate!: Date;

  @Column({ name: 'leave_start', type: 'time', nullable: true })
  leaveStart!: string;

  @Column({ name: 'leave_end', type: 'time', nullable: true })
  leaveEnd!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string;

  @Column({ name: 'leave_status', type: 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING })
  leaveStatus!: LeaveStatus;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Stylist, (s) => s.leaves, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stylist_id' })
  stylist!: Stylist;
}
