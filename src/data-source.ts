import { DataSource } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Appointment } from './entities/appointmenet.entity';
import { AvailabilitySlot } from './entities/availability-slot.entity';
import { User } from './entities/user.entity';
import { config } from 'dotenv';
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url:process.env.DATABASE_URL,
  entities: [User, Doctor, Patient, Appointment, AvailabilitySlot],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
   ssl: {
    rejectUnauthorized: false,
  },
});
