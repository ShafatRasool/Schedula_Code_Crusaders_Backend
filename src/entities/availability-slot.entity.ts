import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';

@Entity()
export class AvailabilitySlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor)
  @JoinColumn()
  doctor: Doctor;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'int', default: 1 })
  maxPatients: number;

  @Column({ type: 'timestamp', nullable: true })
  bookingStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  bookingEndTime: Date;

  @Column({ default: false })
  isFutureAvailable: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
