import { Body, Controller, Post, Get, Param, Patch } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Not, Repository } from 'typeorm';
import { In } from 'typeorm';
import { format, parseISO } from 'date-fns'
import { NotFoundException, BadRequestException} from '@nestjs/common';
const dayjs = require('dayjs');
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { Appointment } from 'src/entities/appointmenet.entity';
import { UpdateAppointmentDto } from 'src/auth/dto/update-appointment.dto';
import { AvailabilitySlot } from 'src/entities/availability-slot.entity';
import { CreateAppointmentDto } from 'src/auth/dto/create-appointment.dto';

export function calculateAppointmentTimes({
  slotDate,
  slotStartTime,
  slotEndTime,
  queuePosition,
  maxPatients
}: {
  slotDate: string,
  slotStartTime: string,
  slotEndTime: string,
  queuePosition: number,
  maxPatients: number
}) {
  if (!slotDate || !slotStartTime || !slotEndTime || !queuePosition || !maxPatients) {
    return { estimatedAttendTime: null, recommendedArrivalTime: null };
  }

  const start = dayjs(`${slotDate} ${slotStartTime}`);
  const end = dayjs(`${slotDate} ${slotEndTime}`);
  const totalMinutes = end.diff(start, 'minute');

  const timePerPatient = Math.floor(totalMinutes / maxPatients);

  const estimatedAttendTime = start.add((queuePosition - 1) * timePerPatient, 'minute');
  const recommendedArrivalTime = estimatedAttendTime.subtract(10, 'minute');

  return {
    estimatedAttendTime: estimatedAttendTime.toISOString(), // ✅ Full datetime
    recommendedArrivalTime: recommendedArrivalTime.format('HH:mm')
  };
}


@Controller('appointments')
export class AppointmentController {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(AvailabilitySlot)
  private readonly availabilityRepo: Repository<AvailabilitySlot>
  ) {}

  private async getNextQueuePosition(slotId: string): Promise<number> {
  const max = await this.appointmentRepo
    .createQueryBuilder('appt')
    .select('MAX(appt.queuePosition)', 'max')
    .where('appt.slotId = :slotId', { slotId })
    .andWhere('appt.status IN (:...statuses)', { statuses: ['booked', 'completed'] })
    .getRawOne();

  return (max?.max || 0) + 1;
}

@Post()
async bookAppointment(
  @Body() dto: CreateAppointmentDto
): Promise<{
  appointment: Appointment;
  message: string;
  expectedTime: { estimatedAttendTime: string; recommendedArrivalTime: string };
}> {
  const now = new Date();

  const selectedSlot = await this.availabilityRepo.findOne({
    where: { id: dto.slotId },
    relations: ['doctor'],
  });

  if (!selectedSlot) throw new NotFoundException('Selected slot not found');

  const bookingStart = new Date(selectedSlot.bookingStartTime);
  const bookingEnd = new Date(selectedSlot.bookingEndTime);

  if (now < bookingStart || now > bookingEnd) {
    throw new BadRequestException('Booking is not allowed for this slot at the current time');
  }

  const currentMaxQueue = await this.getNextQueuePosition(selectedSlot.id) - 1;
  const isSlotFull = currentMaxQueue >= selectedSlot.maxPatients;

  const patient = await this.patientRepo.findOneBy({ id: dto.patientId });
  if (!patient) throw new NotFoundException('Patient not found');

  const existingAppointment = await this.appointmentRepo.findOne({
    where: {
      slot: { id: selectedSlot.id },
      patient: { id: patient.id },
      status: In(['booked', 'completed']),
    },
  });

  if (existingAppointment) {
    throw new BadRequestException('You have already booked this slot.');
  }

  // ✅ Case 1: Slot is NOT full → Book directly
  if (!isSlotFull) {
    const appointment = this.appointmentRepo.create({
      patient,
      doctor: selectedSlot.doctor,
      slot: selectedSlot,
      status: 'booked',
      queuePosition: currentMaxQueue + 1,
      notes: dto.notes || '',
    });

    await this.appointmentRepo.save(appointment);

    const { estimatedAttendTime, recommendedArrivalTime } = calculateAppointmentTimes({
  slotDate: selectedSlot.date,
  slotStartTime: selectedSlot.startTime,
  slotEndTime: selectedSlot.endTime,
  queuePosition: appointment.queuePosition,
  maxPatients: selectedSlot.maxPatients,
  });

  const estimatedAttendTimeFormatted = dayjs(estimatedAttendTime, 'HH:mm').format('hh:mm A');
  const recommendedArrivalTimeFormatted = dayjs(`${selectedSlot.date} ${recommendedArrivalTime}`, 'YYYY-MM-DD HH:mm').format('hh:mm A');

  const expectedTime = {
    estimatedAttendTime: estimatedAttendTimeFormatted,
    recommendedArrivalTime: recommendedArrivalTimeFormatted,
  };


    return {
      appointment,
      message: 'Appointment booked successfully for selected slot',
      expectedTime,
    };
  }

  // ✅ Case 2: Slot is FULL → Check if future booking is allowed
  if (!selectedSlot.isFutureAvailable) {
    throw new BadRequestException('Selected slot is full and does not allow future booking');
  }

  // ✅ Case 3: Find next available slot that allows booking
  const futureSlots = await this.availabilityRepo.find({
    where: {
      doctor: { id: selectedSlot.doctor.id },
      date: MoreThanOrEqual(selectedSlot.date),
    },
    relations: ['doctor'],
    order: {
      date: 'ASC',
      startTime: 'ASC',
    },
  });

  let fallbackSlot: AvailabilitySlot | null = null;
  let fallbackQueue = 0;

  for (const slot of futureSlots) {
    const queuePos = await this.getNextQueuePosition(slot.id) - 1;

    if (queuePos < slot.maxPatients) {
      fallbackSlot = slot;
      fallbackQueue = queuePos;
      break;
    }

    if (!slot.isFutureAvailable) {
      break; // stop looking further
    }
  }

  if (!fallbackSlot) {
    throw new BadRequestException('No available future slot found for this doctor.');
  }

  const fallbackAppointment = this.appointmentRepo.create({
    patient,
    doctor: fallbackSlot.doctor,
    slot: fallbackSlot,
    status: 'booked',
    queuePosition: fallbackQueue + 1,
    notes: dto.notes || '',
  });

  await this.appointmentRepo.save(fallbackAppointment);

  const { estimatedAttendTime, recommendedArrivalTime } = calculateAppointmentTimes({
    slotDate: fallbackSlot.date,
    slotStartTime: fallbackSlot.startTime,
    slotEndTime: fallbackSlot.endTime,
    queuePosition: fallbackAppointment.queuePosition,
    maxPatients: fallbackSlot.maxPatients,
  });

  const estimatedAttendTimeFormatted = dayjs(estimatedAttendTime, 'HH:mm').format('hh:mm A');
  const recommendedArrivalTimeFormatted = dayjs(`${fallbackSlot.date} ${recommendedArrivalTime}`, 'YYYY-MM-DD HH:mm').format('hh:mm A');

  const expectedTime = {
    estimatedAttendTime: estimatedAttendTimeFormatted,
    recommendedArrivalTime: recommendedArrivalTimeFormatted,
  };

  

  return {
    appointment: fallbackAppointment,
    message: 'Selected slot was full. You have been booked for the next available slot.',
    expectedTime,
  };
}


@Get('patient/:id')
async getAppointmentsByPatient(@Param('id') patientId: string) {
  try {
    const cleanId = patientId.trim();

    const patient = await this.patientRepo.findOne({
      where: { id: cleanId },
      relations: ['user']
    });

    if (!patient) {
      return { message: 'Patient not found' };
    }

    const appointments = await this.appointmentRepo.find({
      where: {
        patient: { id: cleanId },
        status: 'booked' // ✅ Include only booked appointments
      },
      relations: ['doctor', 'doctor.user', 'slot'],
      order: {
        slot: {
          date: 'ASC',
          startTime: 'ASC'
        }
      }
    });

    const now = new Date();

    const upcomingAppointments = appointments
      .map(app => {
        if (!app.slot?.date || !app.slot?.startTime || !app.slot?.endTime) return null;

        const { estimatedAttendTime, recommendedArrivalTime } = calculateAppointmentTimes({
          slotDate: app.slot.date,
          slotStartTime: app.slot.startTime,
          slotEndTime: app.slot.endTime,
          queuePosition: app.queuePosition,
          maxPatients: app.slot.maxPatients
        });

        const estimated = dayjs(`${app.slot.date} ${estimatedAttendTime}`, 'YYYY-MM-DD HH:mm').toDate();
        const estimatedAttendTimeFormatted = dayjs(estimatedAttendTime, 'HH:mm').format('hh:mm A');
        const recommendedArrivalTimeFormatted = dayjs(`${app.slot.date} ${recommendedArrivalTime}`, 'YYYY-MM-DD HH:mm').format('hh:mm A');

        // if (estimated <= now) return null;

        return {
          id: app.id,
          status: app.status,
          notes: app.notes,
          queuePosition: app.queuePosition,
          slot: {
            id: app.slot.id,
            date: app.slot.date,
            time: `${app.slot.startTime} - ${app.slot.endTime}`,
            estimatedAttendTime: estimatedAttendTimeFormatted,
            recommendedArrivalTimeFormatted
          },
          doctor: {
            id: app.doctor.id,
            name: app.doctor.user.name,
            email: app.doctor.user.email,
            specialization: app.doctor.specialization,
            location: app.doctor.location
          }
        };
      })
      .filter(Boolean); // Removes nulls

    return {
      message: 'Appointments retrieved successfully',
      patient: {
        id: patient.id,
        name: patient.user.name,
        email: patient.user.email,
        birthdate: patient.birthdate
      },
      appointments: upcomingAppointments
    };

  } catch (error) {
    console.error('Error fetching appointments:', error);
    return {
      message: 'An unexpected error occurred while fetching appointments.'
    };
  }
}


@Get('doctor/:id')
async getAppointmentsByDoctor(@Param('id') doctorId: string) {
  try {
    const cleanId = doctorId.trim();

    const appointments = await this.appointmentRepo.find({
      where: {
        doctor: { id: cleanId }
      },
      order: {
        slot: {
          date: 'ASC',
          startTime: 'ASC'
        }
      },
      relations: ['doctor', 'doctor.user', 'patient', 'patient.user', 'slot']
    });

    if (!appointments.length) {
      return { message: 'No appointments found for this doctor.' };
    }

    const doctor = {
      id: appointments[0].doctor.id,
      name: appointments[0].doctor.user.name,
      email: appointments[0].doctor.user.email,
      specialization: appointments[0].doctor.specialization,
      location: appointments[0].doctor.location
    };

    const slotMap = new Map();

    for (const app of appointments) {
      // Combine slot.date and slot.endTime into one Date object
      const slotDateTime = new Date(`${app.slot.date}T${app.slot.endTime}`);

      // Skip past appointments
      if (slotDateTime < new Date()) {
        continue;
      }

      const slotId = app.slot.id;

      if (!slotMap.has(slotId)) {
        slotMap.set(slotId, {
          id: slotId,
          date: app.slot.date,
          time: `${app.slot.startTime} - ${app.slot.endTime}`,
          appointments: []
        });
      }

      slotMap.get(slotId).appointments.push({
        id: app.id,
        status: app.status,
        notes: app.notes,
        queuePosition: app.queuePosition,
        patient: {
          id: app.patient.id,
          name: app.patient.user.name,
          email: app.patient.user.email,
          birthdate: app.patient.birthdate
        }
      });
    }

    const upcomingSlots = Array.from(slotMap.values());

    if (upcomingSlots.length === 0) {
      return { message: 'No upcoming appointments found for this doctor.' };
    }

    return {
      message: 'Upcoming appointments for doctor retrieved successfully',
      doctor,
      slots: upcomingSlots
    };

  } catch (error) {
    console.error('Error while fetching appointment:', error);
    return { message: 'An unexpected error occurred while fetching the appointment.' };
  }
}

// patients are going to use this endpoint
@Patch('patient/:id/status')
async updateAppointmentStatusByPatient(
  @Param('id') id: string,
  @Body() dto: UpdateAppointmentDto
) {
  try {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['doctor', 'patient', 'slot'],
    });

    if (!appointment) {
      return { statusCode: 404, message: 'Appointment not found' };
    }

    const slot = appointment.slot;
    const doctor = appointment.doctor;

    if (!slot) {
      return { statusCode: 400, message: 'Associated slot not found' };
    }

    const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
    const now = new Date();

    // Prevent cancel/reschedule within 1 hour
    if (slotDateTime.getTime() - now.getTime() < 60 * 60 * 1000) {
      return {
        message: 'Cannot cancel/reschedule within 1 hour of appointment.',
      };
    }

    // Shift queue: free up the cancelled/rescheduled slot position
    const sameSlotAppointments = await this.appointmentRepo.find({
      where: {
        slot: { id: slot.id },
        status: 'booked',
      },
      order: { queuePosition: 'ASC' },
    });

    for (const appt of sameSlotAppointments) {
      if (appt.queuePosition > appointment.queuePosition) {
        appt.queuePosition -= 1;
        await this.appointmentRepo.save(appt);
      }
    }

    if (dto.status === 'cancelled') {
      appointment.status = 'cancelled';
      await this.appointmentRepo.save(appointment);
      return { message: 'Appointment cancelled successfully.' };
    }

    if (dto.status === 'rescheduled') {
      appointment.status = 'rescheduled';
      await this.appointmentRepo.save(appointment);

  // Step 1: Fetch all future slots for this doctor
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  const futureSlots = await this.availabilityRepo.find({
    where: {
      doctor: { id: doctor.id },
      date: MoreThanOrEqual(today),
    },
  });

  // Step 2: Filter based on appointment count
  const availableSlots: AvailabilitySlot[] = [];

  for (const slot of futureSlots) {
    const bookedCount = await this.appointmentRepo.count({
      where: {
        slot: { id: slot.id },
        status: 'booked',
      },
    });

    if (bookedCount < slot.maxPatients) {
      availableSlots.push(slot);
    }
  }


    return {
      message: 'Appointment marked as rescheduled. Please choose a new slot.',
      availableSlots,
      };
    }

    return { message: 'Invalid status provided.' };
  } catch (error) {
    console.error('Error updating appointment status by patient:', error);
    return { message: 'Unexpected error occurred while updating appointment.' };
  }
}

// Used by Doctors to mark status 
@Patch('doctor/:id/status')
async updateAppointmentStatusByDoctor(
  @Param('id') id: string,
  @Body() dto: UpdateAppointmentDto
) {
  try {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['doctor', 'slot'],
    });

    if (!appointment) {
      return { statusCode: 404, message: 'Appointment not found' };
    }

    const validStatuses = ['completed', 'cancelled'];
    const incomingStatus = dto.status;

    if (!validStatuses.includes(incomingStatus)) {
      return { message: 'Invalid status. Allowed: completed, cancelled' };
    }

    const slot = appointment.slot;
    const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
    const now = new Date();

    // 🛑 Block cancellation within 1 hour
    if (incomingStatus === 'cancelled' && slotDateTime.getTime() - now.getTime() < 60 * 60 * 1000) {
      return {
        message: 'Cannot cancel the appointment within 1 hour of its scheduled time.',
      };
    }

    // 🔁 Adjust queue only on cancellation
    if (incomingStatus === 'cancelled') {
      const sameSlotAppointments = await this.appointmentRepo.find({
        where: {
          slot: { id: appointment.slot.id },
          status: 'booked',
        },
        order: { queuePosition: 'ASC' },
      });

      for (const appt of sameSlotAppointments) {
        if (appt.queuePosition > appointment.queuePosition) {
          appt.queuePosition -= 1;
          await this.appointmentRepo.save(appt);
        }
      }
    }

    // ✅ Update status and save
    appointment.status = incomingStatus;
    await this.appointmentRepo.save(appointment);

    return { message: `Appointment marked as ${incomingStatus}` };
  } catch (error) {
    console.error('Error updating appointment status by doctor:', error);
    return { message: 'Unexpected error occurred while updating status' };
  }
}
}
