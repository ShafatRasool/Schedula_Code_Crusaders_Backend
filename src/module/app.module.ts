import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { AuthModule } from '../auth/auth.module';
import { AppService } from '../app.service';
import { DoctorModule } from './doctor.module';
import { PatientModule } from './patient.module';
import { AppController } from '../controller/app.controller';
import { Appointment } from 'src/entities/appointmenet.entity';
import { AvailabilitySlot } from 'src/entities/availability-slot.entity';
import { AvailabilityModule } from './availability.module';
import { AppointmentModule } from './appointment.module';
import { ConfigModule } from '@nestjs/config';

@Module({
     imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes env variables available app-wide
    }),
   TypeOrmModule.forRoot({
      type: 'postgres',
      url:process.env.DATABASE_URL,
      // host: process.env.DB_HOST,
      // port: parseInt(process.env.DB_PORT || '5432', 10),
      // username: process.env.DB_USER,      // ✅ correct key name
      // password: process.env.DB_PASS,      // ✅ correct key name
      // database: process.env.DB_NAME,
      entities: [User, Doctor, Patient, Appointment, AvailabilitySlot],
      synchronize: false,
      autoLoadEntities: true,
      ssl: {
      rejectUnauthorized: false,
    },
    extra: {
      ssl: {
        rejectUnauthorized: false,
      },
    }

       
    }),
    AuthModule,
    DoctorModule,
    PatientModule,
    AvailabilityModule,
    AppointmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
