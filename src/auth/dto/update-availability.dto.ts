export class UpdateAvailabilityDto {
  // Optional: specify exact dates to update
  updatedSlotDates?: string[]; // e.g., ['2025-07-30', '2025-08-06']

  // Optional: specify day for recurring updates
  dayName?: string; // e.g., 'Friday' — used for weekly recurring updates

  // Optional: number of repeat weeks (used only when dayName is given)
  repeatWeeks?: number; // e.g., 3 — keep 3 weeks of Friday slots

  // Doctor ID for whom the slots belong
  doctorId: string;

  // Optional updated values for the slot(s)
  startTime?: string; // '10:00:00'
  endTime?: string;   // '11:00:00'
  maxPatients?: number;

  bookingStartTime: string;      // When patients can start booking (e.g., '09:00:00')
  bookingEndTime: string;        // When patients can no longer book (e.g., '10:30:00')

  isFutureAvailable?: boolean;

}
