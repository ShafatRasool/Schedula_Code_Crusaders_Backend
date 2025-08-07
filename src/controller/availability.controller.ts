import { Body, Controller, Post, Get, Param, Delete, Patch, Put, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, format, isBefore, parseISO } from 'date-fns';
import { In, MoreThan, MoreThanOrEqual, Raw, Repository } from 'typeorm';
import { AvailabilitySlot } from '../entities/availability-slot.entity';
import { Doctor } from '../entities/doctor.entity';
import { CreateAvailabilityDto } from 'src/auth/dto/create-availability';
import { UpdateAvailabilityDto } from 'src/auth/dto/update-availability.dto';
import { Appointment } from 'src/entities/appointmenet.entity';

@Controller('availability')
export class AvailabilityController {
  constructor(
    @InjectRepository(AvailabilitySlot)
    private readonly availabilityRepo: Repository<AvailabilitySlot>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
  ) {}

convertTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}


private validateTimeFormat(startTime: string, endTime: string): boolean {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  return startTotal < endTotal;
}

async isSlotOverlap(
  doctorId: string,
  date: string, 
  startTime: string,
  endTime: string
): Promise<boolean> {
  const existingSlots = await this.availabilityRepo.find({
    where: {
      doctor: { id: doctorId },
      date,
    },
  });

  const newStart = this.convertTimeToMinutes(startTime);
  const newEnd = this.convertTimeToMinutes(endTime);

  for (const slot of existingSlots) {
    const existingStart = this.convertTimeToMinutes(slot.startTime);
    const existingEnd = this.convertTimeToMinutes(slot.endTime);

    if (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (existingStart >= newStart && existingStart < newEnd)
    ) {
      return true;
    }
  }

  return false;
}

// Generate the Dates for a specific Day
private generateRepeatDates(dayOfWeek: string, repeatWeeks: number, startTime: string, endTime: string): string[] {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDayIndex = dayNames.indexOf(dayOfWeek);
  if (targetDayIndex === -1) return [];

  const today = new Date();
  const dates: string[] = [];

  const currentDayIndex = today.getDay();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  const endParts = endTime.split(':').map(Number);
  const endMinutes = endParts[0] * 60 + endParts[1];

  let baseDate = new Date();

  // ✅ If today is the target day and current time is before endTime, include today
  if (currentDayIndex === targetDayIndex && nowMinutes < endMinutes) {
    dates.push(baseDate.toISOString().split('T')[0]);
  }

  // Determine the offset for the next occurrence
  let daysUntilTarget = (targetDayIndex - currentDayIndex + 7) % 7;

  if (daysUntilTarget === 0 && nowMinutes < endMinutes) {
    // today already included, skip next week
    daysUntilTarget = 7;
  }

  baseDate.setDate(today.getDate() + daysUntilTarget);

  while (dates.length < repeatWeeks) {
    dates.push(baseDate.toISOString().split('T')[0]);
    baseDate.setDate(baseDate.getDate() + 7);
  }

  return dates;
}

// Use to Create Slots For Doctor
@Post()
async createAvailability(@Body() dto: CreateAvailabilityDto) {
  try {
    const doctor = await this.doctorRepo.findOneBy({ id: dto.doctorId });
    if (!doctor) {
      return { message: 'Doctor not found' };
    }

    // Validate main time range
    if (!this.validateTimeFormat(dto.startTime, dto.endTime)) {
      return { message: 'Invalid time range. Start must be before end.' };
    }

    // Optionally validate booking time range
    if (dto.bookingStartTime && dto.bookingEndTime && !this.validateTimeFormat(dto.bookingStartTime, dto.bookingEndTime)) {
      return { message: 'Invalid booking time range. Start must be before end.' };
    }

    const repeatWeeks = dto.repeatWeeks || 1;
    const dates = this.generateRepeatDates(dto.dayOfWeek, repeatWeeks, dto.startTime, dto.endTime);

    const slotsToCreate: AvailabilitySlot[] = [];

    for (const date of dates) {
      const overlap = await this.isSlotOverlap(
        doctor.id,
        date,
        dto.startTime,
        dto.endTime
      );

      if (!overlap) {
        const slot = this.availabilityRepo.create({
        doctor,
        date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        bookingStartTime: new Date(`${date}T${dto.bookingStartTime ?? dto.startTime}`),
        bookingEndTime: new Date(`${date}T${dto.bookingEndTime ?? dto.endTime}`),
        maxPatients: dto.maxPatients ?? 1,
        isFutureAvailable: dto.isFutureAvailable ?? false, 
        createdAt: new Date(),
        updatedAt: new Date(),
      });

        slotsToCreate.push(slot);
      }
    }

    if (slotsToCreate.length === 0) {
      return { message: 'No non-overlapping slots to create.' };
    }

    const saved = await this.availabilityRepo.save(slotsToCreate);
    return {
      message: 'Availability slot(s) created successfully',
      slots: saved,
    };

  } catch (error) {
    console.error('Error while creating availability:', error);
    return { message: 'An unexpected error occurred while creating slot.' };
  }
}

@Put('/bulk-update')
async updateAvailabilitySlots(@Body() dto: UpdateAvailabilityDto): Promise<any> {
  const updatedSlots: AvailabilitySlot[] = [];
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // ✅ Case 1: Update by specific slot dates
  if (dto.updatedSlotDates && dto.updatedSlotDates.length > 0) {
    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException('startTime and endTime are required for specific date updates.');
    }

    for (const date of dto.updatedSlotDates) {
      const slot = await this.availabilityRepo.findOne({
        where: {
          doctor: { id: dto.doctorId },
          date,
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
      });

      if (!slot) continue;

      const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
      if (slotDateTime <= oneHourLater) {
        continue;
      }

      // Update fields
      if (dto.bookingStartTime) {
        slot.bookingStartTime = new Date(`${slot.date}T${dto.bookingStartTime}`);
      }
      if (dto.bookingEndTime) {
        slot.bookingEndTime = new Date(`${slot.date}T${dto.bookingEndTime}`);
      }
      if (dto.isFutureAvailable !== undefined) {
        slot.isFutureAvailable = dto.isFutureAvailable;
      }

      if (dto.maxPatients !== undefined) {
        const appointments = await this.appointmentRepo.find({
          where: { slot: { id: slot.id } },
          order: { createdAt: 'ASC' },
        });

        if (appointments.length > dto.maxPatients) {
          const appointmentsToDelete = appointments.slice(dto.maxPatients);
          for (const appointment of appointmentsToDelete) {
            const appointmentDateTime = new Date(`${slot.date}T${slot.startTime}`);
            if (appointmentDateTime > oneHourLater) {
              await this.appointmentRepo.delete({ id: appointment.id });
            }
          }
        }

        slot.maxPatients = dto.maxPatients;
      }

      await this.availabilityRepo.save(slot);
      updatedSlots.push(slot);
    }

  // ✅ Case 2: Update by recurrence
  } else if (dto.dayName && dto.repeatWeeks !== undefined) {
    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException('startTime and endTime are required for recurring updates.');
    }

    const repeatDates = this.generateRepeatDates(dto.dayName, dto.repeatWeeks, dto.startTime, dto.endTime);

    for (const date of repeatDates) {
      const slot = await this.availabilityRepo.findOne({
        where: {
          doctor: { id: dto.doctorId },
          date,
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
      });

      if (!slot) continue;

      const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
      if (slotDateTime <= oneHourLater) {
        continue;
      }

      if (dto.bookingStartTime) {
        slot.bookingStartTime = new Date(`${slot.date}T${dto.bookingStartTime}`);
      }
      if (dto.bookingEndTime) {
        slot.bookingEndTime = new Date(`${slot.date}T${dto.bookingEndTime}`);
      }
      if (dto.isFutureAvailable !== undefined) {
        slot.isFutureAvailable = dto.isFutureAvailable;
      }

      if (dto.maxPatients !== undefined) {
        const appointments = await this.appointmentRepo.find({
          where: { slot: { id: slot.id } },
          order: { createdAt: 'ASC' },
        });

        if (appointments.length > dto.maxPatients) {
          const appointmentsToDelete = appointments.slice(dto.maxPatients);
          for (const appointment of appointmentsToDelete) {
            const appointmentDateTime = new Date(`${slot.date}T${slot.startTime}`);
            if (appointmentDateTime > oneHourLater) {
              await this.appointmentRepo.delete({ id: appointment.id });
            }
          }
        }

        slot.maxPatients = dto.maxPatients;
      }

      await this.availabilityRepo.save(slot);
      updatedSlots.push(slot);
    }

  } else {
    throw new BadRequestException('Either updatedSlotDates OR dayName and repeatWeeks must be provided.');
  }

  return {
    message: 'Updated slots successfully',
    updatedCount: updatedSlots.length,
  };
}


@Patch(':id/live-update')
async updateTodaySlot(
  @Param('id') id: string,
  @Body() dto: UpdateAvailabilityDto
) {
  try {
    const slot = await this.availabilityRepo.findOne({
      where: { id },
      relations: ['doctor'],
    });

    if (!slot) {
      return { statusCode: 404, message: 'Slot not found' };
    }

    const now = new Date();
    const currentStart = new Date(`${slot.date}T${slot.startTime}`);
    const diffMinutes = (currentStart.getTime() - now.getTime()) / (1000 * 60);

    // --- Validate startTime and endTime ---
    if (dto.startTime) {
      const newStart = new Date(`${slot.date}T${dto.startTime}`);
      if (newStart < now) {
        return {
          statusCode: 400,
          message: 'Cannot update slot startTime to a past time.',
        };
      }
    }

    if (dto.endTime) {
      const newEnd = new Date(`${slot.date}T${dto.endTime}`);
      if (newEnd < now) {
        return {
          statusCode: 400,
          message: 'Cannot update slot endTime to a past time.',
        };
      }
    }

    // --- Validate booking window ---
    if (dto.bookingStartTime) {
      const newBookingStart = new Date(`${slot.date}T${dto.bookingStartTime}`);
      if (newBookingStart < now) {
        return {
          statusCode: 400,
          message: 'Cannot update bookingStartTime to a past time.',
        };
      }
    }

    if (dto.bookingEndTime) {
      const newBookingEnd = new Date(`${slot.date}T${dto.bookingEndTime}`);
      if (newBookingEnd < now) {
        return {
          statusCode: 400,
          message: 'Cannot update bookingEndTime to a past time.',
        };
      }
    }

    // --- Validate time ordering ---
    if (dto.startTime && dto.endTime) {
      const newStart = new Date(`${slot.date}T${dto.startTime}`);
      const newEnd = new Date(`${slot.date}T${dto.endTime}`);
      if (newStart >= newEnd) {
        return {
          statusCode: 400,
          message: 'Start time must be before end time.',
        };
      }
    }

    if (dto.bookingStartTime && dto.bookingEndTime) {
      const newBookingStart = new Date(`${slot.date}T${dto.bookingStartTime}`);
      const newBookingEnd = new Date(`${slot.date}T${dto.bookingEndTime}`);
      if (newBookingStart >= newBookingEnd) {
        return {
          statusCode: 400,
          message: 'Booking start time must be before booking end time.',
        };
      }
    }

    // --- Fetch booked appointments ---
    const todayAppointments = await this.appointmentRepo.find({
      where: {
        slot: { id: slot.id },
        status: 'booked',
      },
      order: { queuePosition: 'ASC' },
    });

    const currentBookingCount = todayAppointments.length;

    // --- Enforce critical restrictions within 30 minutes of start time ---
    if (diffMinutes <= 30) {
      if (
        dto.endTime &&
        new Date(`${slot.date}T${dto.endTime}`) <
          new Date(`${slot.date}T${slot.endTime}`)
      ) {
        return {
          statusCode: 400,
          message: 'Cannot reduce slot window within 30 minutes of start time.',
        };
      }

      if (
        dto.maxPatients !== undefined &&
        dto.maxPatients < currentBookingCount
      ) {
        return {
          statusCode: 400,
          message: 'Cannot reduce maxPatients below current bookings within 30 minutes.',
        };
      }

      if (
        dto.bookingEndTime &&
        slot.bookingEndTime &&
        new Date(`${slot.date}T${dto.bookingEndTime}`) <
          new Date(slot.bookingEndTime)
      ) {
        return {
          statusCode: 400,
          message: 'Cannot reduce booking window within 30 minutes of slot start time.',
        };
      }
    }

    // --- Shrink outside 30 min: reassign extra appointments ---
    if (
      dto.maxPatients !== undefined &&
      dto.maxPatients < currentBookingCount &&
      diffMinutes > 30
    ) {
      const extraAppointments = todayAppointments.slice(dto.maxPatients);

      for (const appt of extraAppointments) {
        const nextSlot = await this.availabilityRepo.findOne({
          where: {
            doctor: { id: slot.doctor.id },
            date: MoreThanOrEqual(slot.date),
            startTime: MoreThan(slot.endTime),
            isFutureAvailable: true,
          },
          order: { date: 'ASC', startTime: 'ASC' },
        });

        if (
          nextSlot &&
          (await this.appointmentRepo.count({
            where: { slot: { id: nextSlot.id }, status: 'booked' },
          })) < nextSlot.maxPatients
        ) {
          appt.slot = nextSlot;
          appt.queuePosition =
            (await this.appointmentRepo.count({
              where: { slot: { id: nextSlot.id }, status: 'booked' },
            })) + 1;
          await this.appointmentRepo.save(appt);
        } else {
          await this.appointmentRepo.remove(appt); // fallback
        }
      }
    }

    // --- Apply updates ---
    slot.startTime = dto.startTime ?? slot.startTime;
    slot.endTime = dto.endTime ?? slot.endTime;
    slot.maxPatients = dto.maxPatients ?? slot.maxPatients;
    slot.bookingStartTime = dto.bookingStartTime
      ? new Date(`${slot.date}T${dto.bookingStartTime}`)
      : slot.bookingStartTime;
    slot.bookingEndTime = dto.bookingEndTime
      ? new Date(`${slot.date}T${dto.bookingEndTime}`)
      : slot.bookingEndTime;
    slot.isFutureAvailable =
      dto.isFutureAvailable !== undefined
        ? dto.isFutureAvailable
        : slot.isFutureAvailable;
    slot.updatedAt = new Date();

    const updatedSlot = await this.availabilityRepo.save(slot);

    return {
      message: 'Live slot updated successfully.',
      slot: updatedSlot,
    };
  } catch (error) {
    console.error('Error in live update:', error);
    return {
      statusCode: 500,
      message: 'An error occurred while updating the slot.',
    };
  }
}


// Delete Single Slot
@Delete(':id')
async deleteAvailabilitySlot(@Param('id') id: string) {
  try {
    const slot = await this.availabilityRepo.findOne({
      where: { id },
    });

    if (!slot) {
      return { statusCode: 404, message: 'Slot not found' };
    }

    const slotStartTime = new Date(`${slot.date}T${slot.startTime}`);
    const now = new Date();

    // Only care about future slots
    if (slotStartTime > now) {
      const appointment = await this.appointmentRepo.findOne({
        where: {
          slot: { id },
          status: In(['booked']),
        },
        relations: ['slot'],
      });

      if (appointment) {
        const hoursDiff = (slotStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursDiff <= 2) {
          return {
            statusCode: 400,
            message: 'Cannot modify slot — it has a booked appointment within the next 2 hours.',
          };
        }

        
        appointment.status = 'cancelled';
        await this.appointmentRepo.save(appointment);

      }
    }

    // Instead of deleting, disable the slot
    slot.startTime = '00:00:00';
    slot.endTime = '00:00:00';
    slot.maxPatients = 0;

    await this.availabilityRepo.save(slot);

    return { message: 'Slot disabled successfully (not deleted).' };
  } catch (error) {
    console.error('Error while disabling slot:', error);
    return {
      statusCode: 500,
      message: 'An unexpected error occurred while disabling slot.',
    };
  }
}

// Delete Multiple Slots on a specific Date
@Delete('/doctor/:doctorId/date/:date')
async deleteSlotsByDate(
  @Param('doctorId') doctorId: string,
  @Param('date') date: string,
) {
  try {
    const slots = await this.availabilityRepo.find({
      where: {
        doctor: { id: doctorId },
        date,
      },
    });

    if (!slots.length) {
      return { message: `No slots found for ${date}.` };
    }

    const blockedSlotIds: string[] = [];
    const updatedSlots: AvailabilitySlot[] = [];

    for (const slot of slots) {
      const appointments = await this.appointmentRepo.find({
        where: {
          slot: { id: slot.id },
          status: In(['booked']),
        },
      });

      let isBlocked = false;

      for (const appointment of appointments) {
        const slotStartTime = new Date(`${slot.date}T${slot.startTime}`);
        const now = new Date();
        const hoursDiff = (slotStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (slotStartTime > now && hoursDiff <= 2) {
          isBlocked = true;
          break;
        }
      }

      if (isBlocked) {
        blockedSlotIds.push(slot.id);
        continue;
      }

      // Cancel all booked appointments
      for (const appointment of appointments) {
        appointment.status = 'cancelled';
        await this.appointmentRepo.save(appointment);
      }

      // Disable the slot (neutral values)
      slot.startTime = '00:00:00';
      slot.endTime = '00:00:00';
      slot.maxPatients = 0;
      updatedSlots.push(slot);
    }

    if (blockedSlotIds.length > 0) {
      return {
        statusCode: 400,
        message: `Cannot disable ${blockedSlotIds.length} slot(s) — at least one appointment is booked and within 2 hours.`,
        blockedSlots: blockedSlotIds,
      };
    }

    await this.availabilityRepo.save(updatedSlots);

    return {
      message: `Disabled ${updatedSlots.length} slot(s) for ${date}. All associated booked appointments cancelled.`,
    };
  } catch (error) {
    console.error('Error disabling slots by date:', error);
    return {
      statusCode: 500,
      message: 'Internal error while disabling slots.',
    };
  }
}

// Delete all Slots Without appointment under 2 hr
@Delete('/all/:doctorId')
async deleteAllSlotsForDoctor(@Param('doctorId') doctorId: string) {
  try {
    const doctor = await this.doctorRepo.findOneBy({ id: doctorId });
    if (!doctor) {
      return { statusCode: 404, message: 'Doctor not found' };
    }

    const slots = await this.availabilityRepo.find({
      where: { doctor: { id: doctorId } },
    });

    if (!slots.length) {
      return { message: 'No slots found for the doctor.' };
    }

    const blockedSlotIds: string[] = [];
    const updatedSlots: AvailabilitySlot[] = [];
    const now = new Date();

    for (const slot of slots) {
      const slotStartTime = new Date(`${slot.date}T${slot.startTime}`);

      const appointments = await this.appointmentRepo.find({
      where: {
        slot: { id: slot.id },
        status: In(['booked']),
      },
    });

    if (appointments.length > 0) {
      const hoursDiff = (slotStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (slotStartTime > now && hoursDiff <= 2) {
        blockedSlotIds.push(slot.id);
        continue;
      }

      // Cancel all booked appointments
      for (const appointment of appointments) {
        appointment.status = 'cancelled';
        await this.appointmentRepo.save(appointment);
      }
    }


      // Instead of deleting, disable the slot
      slot.startTime = '00:00:00';
      slot.endTime = '00:00:00';
      slot.maxPatients = 0;
      updatedSlots.push(slot);
    }

    if (updatedSlots.length > 0) {
      await this.availabilityRepo.save(updatedSlots);
    }

    return {
      message: `Updated ${updatedSlots.length} slot(s).`,
      skippedSlots: blockedSlotIds.length,
      blockedSlotIds,
    };
  } catch (error) {
    console.error('Error updating slots:', error);
    return {
      statusCode: 500,
      message: 'Error while updating slots.',
    };
  }
}

@Get(':doctorId')
async getDoctorAvailability(@Param('doctorId') doctorId: string) {
  try {
    const doctor = await this.doctorRepo.findOne({
      where: { id: doctorId },
      relations: ['user'],
    });

    if (!doctor) {
      return { statusCode: 404, message: 'Doctor not found' };
    }

    const today = new Date().toISOString().split('T')[0];

    const slots = await this.availabilityRepo.find({
      where: {
        doctor: { id: doctorId },
        date: MoreThanOrEqual(today),
      },
      order: {
        date: 'ASC',
        startTime: 'ASC',
      },
    });

    const result: {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      bookingStartTime: string;
      bookingEndTime: string;
      maxPatients: number;
      booked: number;
      available: number;
    }[] = [];

    for (const slot of slots) {
      const bookedCount = await this.appointmentRepo.count({
        where: {
          slot: { id: slot.id },
          status: 'booked',
        },
      });

      const available = slot.maxPatients - bookedCount;

      if (available > 0) {
        result.push({
          id: slot.id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          bookingStartTime: slot.bookingStartTime?.toISOString() ?? '',
          bookingEndTime: slot.bookingEndTime?.toISOString() ?? '',
          maxPatients: slot.maxPatients,
          booked: bookedCount,
          available,
        });
      }
    }

    return {
      doctor: {
        id: doctor.id,
        name: doctor.user?.name,
        email: doctor.user?.email,
        specialization: doctor.specialization,
      },
      slots: result,
    };
  } catch (error) {
    console.error('Error while fetching doctor availability:', error);
    return {
      statusCode: 500,
      message: 'An unexpected error occurred while fetching availability.',
    };
  }
}

}
