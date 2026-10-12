import { 
  addMinutes, 
  isBefore, 
  isAfter, 
  addDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  format,
  parse,
  isSameDay
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz/toZonedTime';
import { fromZonedTime } from 'date-fns-tz/fromZonedTime';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export interface AvailabilityRule {
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface Booking {
  startTime: Date;
  endTime: Date;
}

export interface SchedulingConfig {
  timezone: string; // e.g., "America/New_York"
  bufferTimeMinutes: number;
  noticePeriodHours: number;
  bookingHorizonDays: number;
  rules: AvailabilityRule[];
}

export interface SlotDetail {
  time: Date;
  isAvailable: boolean;
  status: 'available' | 'booked' | 'conflict' | 'past';
}

/**
 * Calculates all time slots (both available and unavailable) for a given event duration.
 * Unavailable slots include the reason (booked, calendar conflict, or past/notice period).
 */
export function calculateDetailedSlots(
  eventDurationMinutes: number,
  config: SchedulingConfig,
  existingBookings: Booking[],
  externalBusyBlocks: { start: Date; end: Date }[] = [],
  now: Date = new Date()
): SlotDetail[] {
  const allSlots: SlotDetail[] = [];
  
  // 1. Determine the searchable time range
  const searchStart = addMinutes(now, config.noticePeriodHours * 60);
  const searchEnd = endOfDay(addDays(now, config.bookingHorizonDays));

  // Convert our search boundaries into the host's timezone
  const hostTz = config.timezone;
  
  // Get each date in the host's timezone from now to searchEnd
  const daysInHorizon = eachDayOfInterval({
    start: toZonedTime(now, hostTz),
    end: toZonedTime(searchEnd, hostTz)
  });

  for (const hostDay of daysInHorizon) {
    const dayOfWeek = hostDay.getDay() as DayOfWeek;
    
    // Find all rules that apply to this day of the week
    const dayRules = config.rules.filter(r => r.dayOfWeek === dayOfWeek);

    for (const rule of dayRules) {
      // Create local start and end bounds for the rule on this specific day
      // We parse the "HH:MM" string and apply it to `hostDay`
      const ruleStartLocal = parse(rule.startTime, 'HH:mm', startOfDay(hostDay));
      const ruleEndLocal = parse(rule.endTime, 'HH:mm', startOfDay(hostDay));

      // Convert local bounds back to absolute UTC instances
      let slotStartUtc = fromZonedTime(ruleStartLocal, hostTz);
      const ruleEndUtc = fromZonedTime(ruleEndLocal, hostTz);

      // Iterate through the rule block in increments of the event duration
      while (true) {
        const slotEndUtc = addMinutes(slotStartUtc, eventDurationMinutes);

        // If this slot exceeds the rule's end time, stop checking this block
        if (isAfter(slotEndUtc, ruleEndUtc)) {
          break;
        }

        // Check if outside horizon
        if (isAfter(slotEndUtc, searchEnd)) {
          break;
        }

        // Check for overlap with existing bookings (including buffers)
        const hasConflict = existingBookings.some(booking => {
          const bStart = new Date(booking.startTime);
          const bEnd = new Date(booking.endTime);
          if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) {
            return false;
          }

          // Booking blocks time from (start - buffer) to (end + buffer)
          const blockedStart = addMinutes(bStart, -config.bufferTimeMinutes);
          const blockedEnd = addMinutes(bEnd, config.bufferTimeMinutes);

          // Overlap check: Slot starts before block ends AND Slot ends after block starts
          return isBefore(slotStartUtc, blockedEnd) && isAfter(slotEndUtc, blockedStart);
        });

        // Check for overlap with external Google Calendar busy blocks
        const hasExternalConflict = externalBusyBlocks.some(block => {
          return isBefore(slotStartUtc, block.end) && isAfter(slotEndUtc, block.start);
        });

        // Check if slot is in the past or within notice period
        const isPastOrNotice = isBefore(slotStartUtc, searchStart) || isBefore(slotStartUtc, now);

        if (hasConflict) {
          allSlots.push({
            time: slotStartUtc,
            isAvailable: false,
            status: 'booked',
          });
        } else if (hasExternalConflict) {
          allSlots.push({
            time: slotStartUtc,
            isAvailable: false,
            status: 'conflict',
          });
        } else if (isPastOrNotice) {
          allSlots.push({
            time: slotStartUtc,
            isAvailable: false,
            status: 'past',
          });
        } else {
          allSlots.push({
            time: slotStartUtc,
            isAvailable: true,
            status: 'available',
          });
        }

        // Advance to the next slot
        slotStartUtc = slotEndUtc;
      }
    }
  }

  return allSlots;
}

/**
 * Calculates available time slots for a given event duration.
 *
 * @param eventDurationMinutes The length of the event.
 * @param config Host's scheduling configuration (timezone, rules, buffers).
 * @param existingBookings Array of already confirmed bookings for the host.
 * @param now The current time (can be overridden for testing).
 * @returns Array of available start times (UTC Dates).
 */
export function calculateAvailableSlots(
  eventDurationMinutes: number,
  config: SchedulingConfig,
  existingBookings: Booking[],
  externalBusyBlocks: { start: Date; end: Date }[] = [],
  now: Date = new Date()
): Date[] {
  return calculateDetailedSlots(
    eventDurationMinutes,
    config,
    existingBookings,
    externalBusyBlocks,
    now
  )
    .filter((s) => s.isAvailable)
    .map((s) => s.time);
}
