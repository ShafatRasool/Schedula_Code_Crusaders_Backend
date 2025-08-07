export class CreateAppointmentDto {
  status: 'booked' | 'cancelled' | 'completed' | 'rescheduled';
  slotId : string; 
  notes?: string; 
  patientId : string;
  doctorId : string;
}
