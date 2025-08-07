export class UpdateAppointmentDto {
  status: 'booked' | 'cancelled' | 'completed' | 'rescheduled';
  newDate?: string;
}
