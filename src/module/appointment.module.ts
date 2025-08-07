import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { AppointmentController } from 'src/controller/appointment.controller';
import { Appointment } from 'src/entities/appointmenet.entity';
import { AvailabilitySlot } from 'src/entities/availability-slot.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Doctor, Patient, AvailabilitySlot])],
  controllers: [AppointmentController],
})
export class AppointmentModule {}
