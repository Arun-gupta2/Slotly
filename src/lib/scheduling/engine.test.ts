import { describe, it, expect } from 'vitest';
import { calculateAvailableSlots, calculateDetailedSlots, SchedulingConfig, Booking } from './engine';
import { parseISO, addHours } from 'date-fns';

describe('Scheduling Engine', () => {
  const baseConfig: SchedulingConfig = {
    timezone: 'UTC',
    bufferTimeMinutes: 0,
    noticePeriodHours: 24,
    bookingHorizonDays: 7,
    rules: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' } // Mondays, 9am to 12pm
    ]
  };

  it('generates slots respecting notice period and horizon', () => {
    // A Monday at 00:00 UTC
    const now = parseISO('2024-01-01T00:00:00Z'); 
    
    // Notice period is 24h, so today's Monday slots should be skipped.
    // The next Monday is 7 days away (2024-01-08), which is at the edge of the 7-day horizon.
    const slots = calculateAvailableSlots(60, baseConfig, [], [], now);
    
    expect(slots).toHaveLength(3); // 9am, 10am, 11am on the next Monday
    expect(slots[0].toISOString()).toBe('2024-01-08T09:00:00.000Z');
    expect(slots[2].toISOString()).toBe('2024-01-08T11:00:00.000Z');
  });

  it('excludes slots overlapping with existing bookings', () => {
    const now = parseISO('2023-12-30T00:00:00Z'); // Saturday
    // Next Monday is 2024-01-01
    
    const bookings: Booking[] = [
      {
        startTime: parseISO('2024-01-01T10:00:00Z'),
        endTime: parseISO('2024-01-01T11:00:00Z')
      }
    ];

    const slots = calculateAvailableSlots(60, baseConfig, bookings, [], now);
    
    // We expect 09:00 and 11:00 to be available, but 10:00 is blocked
    expect(slots).toHaveLength(2);
    expect(slots[0].toISOString()).toBe('2024-01-01T09:00:00.000Z');
    expect(slots[1].toISOString()).toBe('2024-01-01T11:00:00.000Z');
  });

  it('applies buffer time around bookings', () => {
    const now = parseISO('2023-12-30T00:00:00Z'); 
    
    const configWithBuffer: SchedulingConfig = {
      ...baseConfig,
      bufferTimeMinutes: 30
    };

    const bookings: Booking[] = [
      {
        startTime: parseISO('2024-01-01T10:00:00Z'),
        endTime: parseISO('2024-01-01T11:00:00Z')
      }
    ];

    // Using 60 min slots:
    // 09:00 - 10:00 (Buffer needs until 09:30 for the 10:00 meeting -> OK)
    // Wait, if meeting starts at 10:00, buffer is 09:30-10:00. A 09:00-10:00 slot ends at 10:00, 
    // which overlaps with the 09:30 buffer block! 
    // So 09:00 slot is EXCLUDED.
    // 11:00 - 12:00 slot starts at 11:00, but buffer is until 11:30.
    // So 11:00 slot is EXCLUDED.
    
    const slots = calculateAvailableSlots(60, configWithBuffer, bookings, [], now);
    expect(slots).toHaveLength(0); // All three 60-min slots are blocked by the buffer!
  });

  it('correctly handles host timezones', () => {
    const now = parseISO('2023-12-30T00:00:00Z'); 
    
    const nyConfig: SchedulingConfig = {
      ...baseConfig,
      timezone: 'America/New_York' // EST (UTC-5)
    };

    const slots = calculateAvailableSlots(60, nyConfig, [], [], now);
    
    // 09:00 EST = 14:00 UTC
    expect(slots[0].toISOString()).toBe('2024-01-01T14:00:00.000Z');
  });

  it('identifies taken/booked slots in calculateDetailedSlots', () => {
    const now = parseISO('2023-12-30T00:00:00Z');
    const bookings: Booking[] = [
      {
        startTime: parseISO('2024-01-01T10:00:00Z'),
        endTime: parseISO('2024-01-01T11:00:00Z')
      }
    ];

    const detailed = calculateDetailedSlots(60, baseConfig, bookings, [], now);
    const bookedSlot = detailed.find((s: any) => s.status === 'booked');
    
    expect(bookedSlot).toBeDefined();
    expect(bookedSlot!.isAvailable).toBe(false);
    expect(bookedSlot!.time.toISOString()).toBe('2024-01-01T10:00:00.000Z');
  });
});
