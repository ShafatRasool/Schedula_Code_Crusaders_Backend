import { Injectable } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,

    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
  ) {}

  async signup(dto: SignupDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
    });
    await this.userRepository.save(user);

    if (dto.role === 'doctor') {
      await this.doctorRepository.save({
        user: user,
        specialization: '',
        experienceYears: 0,
        bio: '',
        location: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (dto.role === 'patient') {
      if (dto.role === 'patient') {
  await this.patientRepository.save({
    user: { id: user.id }, 
    birthdate: '2000-01-01',
    gender: '',             
    medicalHistory: '', 
  });
}

    }

    return {
      message: 'Signup successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
