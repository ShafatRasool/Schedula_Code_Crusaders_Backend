import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilitySlot } from '../entities/availability-slot.entity';
import { Doctor } from '../entities/doctor.entity';
import { AvailabilityController } from 'src/controller/availability.controller';
import { Appointment } from 'src/entities/appointmenet.entity';


@Module({
  imports: [TypeOrmModule.forFeature([AvailabilitySlot, Doctor, Appointment])],
  controllers: [AvailabilityController],
})
export class AvailabilityModule {}
