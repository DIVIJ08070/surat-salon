import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Stylist } from './stylist.entity';
import { Service } from './service.entity';

@Entity('stylist_services')
export class StylistService {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'stylist_id' })
  stylistId!: number;

  @Column({ name: 'service_id' })
  serviceId!: number;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Stylist, (stylist) => stylist.stylistServices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stylist_id' })
  stylist!: Stylist;

  @ManyToOne(() => Service, (service) => service.stylistServices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service!: Service;
}
