import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { UpdateDoctorDto } from 'src/auth/dto/update-doctor.dto';

@Controller('doctors')
export class DoctorController {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>
  ) {}

  @Patch(':id')
  async updateDoctorProfile(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto
  ) {
    await this.doctorRepo.update(id, dto);
    return { message: 'Doctor profile updated successfully.' };
  }
  @Get(':id')
  async getDoctorById(@Param('id') id: string) {
    const cleanId = id.trim();
    const doctor = await this.doctorRepo.findOne({
      where: { id: cleanId },
      relations: ['user'], // if you want to include user details too
    });

    if (!doctor) {
      return { message: 'Doctor not found' };
    }

    return doctor;
  }
}
