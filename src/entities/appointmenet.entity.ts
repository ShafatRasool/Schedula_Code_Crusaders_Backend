import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Patient } from './patient.entity';
import { AvailabilitySlot } from './availability-slot.entity';
@Entity()
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor)
  @JoinColumn()
  doctor: Doctor;

  @ManyToOne(() => Patient)
  @JoinColumn()
  patient: Patient;

  @ManyToOne(() => AvailabilitySlot)
  @JoinColumn()
  slot: AvailabilitySlot; // NEW — no need for separate date/time fields

  @Column({ type: 'int', nullable: true })
  queuePosition: number;

  @Column({
    type: 'enum',
    enum: ['booked', 'cancelled', 'completed', 'rescheduled'],
    default: 'booked',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
