import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { users, eventTypes, bookings, availabilityRules } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { calculateDetailedSlots, calculateAvailableSlots } from '@/lib/scheduling/engine';
import { getAvailabilitySettings } from '@/lib/actions'; // We'll need a way to fetch public settings
import { getExternalBusyBlocks } from '@/lib/calendar';
import BookingFlow from './BookingFlow';
import styles from './book.module.css';
import { addDays } from 'date-fns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = {
  username: string;
  slug: string;
};

export default async function PublicBookingPage({ params }: { params: Params }) {
  const { username, slug } = params;
  
  // 1. Fetch Host
  const host = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!host) {
    notFound();
  }

  // 2. Fetch Event Type
  const eventType = await db.query.eventTypes.findFirst({
    where: and(
      eq(eventTypes.userId, host.id),
      eq(eventTypes.slug, slug),
      eq(eventTypes.status, 'published')
    ),
  });

  if (!eventType) {
    notFound();
  }

  // 3. Fetch Availability Rules
  const rules = await db.query.availabilityRules.findMany({
    where: eq(availabilityRules.userId, host.id),
  });

  // 4. Fetch existing confirmed bookings within the horizon
  const now = new Date();
  const searchEnd = addDays(now, host.bookingHorizonDays);

  const rawBookings = await db.query.bookings.findMany({
    where: and(
      eq(bookings.userId, host.id),
      eq(bookings.status, 'confirmed')
    ),
  });

  const existingBookings = rawBookings.map((b) => ({
    startTime: new Date(b.startTime),
    endTime: new Date(b.endTime),
  }));

  // Fallback to standard business hours (Mon-Fri 09:00 - 17:00) if no rules are configured
  const defaultRules = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek: dayOfWeek as any,
    startTime: '09:00',
    endTime: '17:00',
  }));

  const activeRules = rules.length > 0
    ? rules.map(r => ({
        dayOfWeek: r.dayOfWeek as any,
        startTime: r.startTime,
        endTime: r.endTime,
      }))
    : defaultRules;

  const config = {
    timezone: host.timezone,
    bufferTimeMinutes: host.bufferTimeMinutes,
    noticePeriodHours: host.noticePeriodHours,
    bookingHorizonDays: host.bookingHorizonDays,
    rules: activeRules,
  };

  // 5. Fetch External Google Calendar Conflicts
  const externalBusyBlocks = await getExternalBusyBlocks(host.id, host.bookingHorizonDays);

  // 6. Calculate Detailed Slots (including available, booked, and conflicting)
  const detailedSlots = calculateDetailedSlots(
    eventType.durationMinutes,
    config,
    existingBookings,
    externalBusyBlocks,
    now
  );

  const serializedSlots = detailedSlots.map((s) => ({
    timeIso: s.time.toISOString(),
    isAvailable: s.isAvailable,
    status: s.status,
  }));

  return (
    <div className={styles.container}>
      <BookingFlow 
        host={{
          id: host.id,
          name: host.name,
          username: host.username,
          timezone: host.timezone,
        }}
        eventType={{
          id: eventType.id,
          name: eventType.name,
          description: eventType.description || '',
          durationMinutes: eventType.durationMinutes,
          location: eventType.location,
        }}
        slots={serializedSlots}
      />
    </div>
  );
}
