import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from '../entities/doctor.entity';
import { DoctorController } from 'src/controller/doctor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor])],
  controllers: [DoctorController],
})
export class DoctorModule {}
