export class CreateAvailabilityDto {
  doctorId: string;        
  dayOfWeek: string;  
  startTime: string;      
  endTime: string; 
  maxPatients: number;     
  repeatWeeks: number;
  bookingStartTime: string;    
  bookingEndTime: string; 
  isFutureAvailable?: boolean;
}
