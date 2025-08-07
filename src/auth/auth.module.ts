import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../entities/user.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Doctor, Patient]) 
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
