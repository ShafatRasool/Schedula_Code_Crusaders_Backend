import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../entities/patient.entity';

@Controller('patients')
export class PatientController {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  // ✅ GET /patients/:id
  @Get(':id')
  async getPatientById(@Param('id') id: string) {
    const cleanId = id.trim();
    const patient = await this.patientRepo.findOne({
      where: { id: cleanId },
      relations: ['user'], // include basic user info
    });

    if (!patient) {
      return { message: 'Patient not found' };
    }

    return patient;
  }

  // ✅ PATCH /patients/:id
  @Patch(':id')
  async updatePatientProfile(
    @Param('id') id: string,
    @Body() body: Partial<Patient>
  ) {
    const cleanId = id.trim();
    await this.patientRepo.update(cleanId, body);
    return { message: 'Patient profile updated successfully' };
  }
}
