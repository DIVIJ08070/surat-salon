import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../common/enums';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Exclude()
  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ name: 'failed_attempts', type: 'tinyint', unsigned: true, default: 0 })
  failedAttempts!: number;

  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil!: Date | null;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens!: RefreshToken[];
}
