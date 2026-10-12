import { db } from '../db';
import { users, eventTypes, bookings, teamEventMembers, teamMembers, outboxMessages, availabilityRules } from '../db/schema';
import { eq, and, gte, lte, lt, gt, inArray, count, desc, asc } from 'drizzle-orm';
import { calculateAvailableSlots, SchedulingConfig, AvailabilityRule, Booking } from './engine';
import { getExternalBusyBlocks } from '../calendar';
import { addDays, addMinutes, subDays } from 'date-fns';

export interface EligibleHostAvailability {
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    timezone: string;
    bufferTimeMinutes: number;
    noticePeriodHours: number;
    bookingHorizonDays: number;
  };
  availableSlots: Date[];
}

/**
 * Fetches all active eligible members for a team event type and calculates their combined available slots.
 */
export async function getTeamEventAvailableSlots(eventTypeId: string, now: Date = new Date()): Promise<{
  eventType: any;
  availableSlots: Date[];
  eligibleHosts: any[];
}> {
  const eventType = await db.query.eventTypes.findFirst({
    where: eq(eventTypes.id, eventTypeId),
    with: {
      team: true,
      teamEventMembers: {
        with: {
          user: true,
        },
      },
    },
  });

  if (!eventType || eventType.status !== 'published') {
    throw new Error('Event type not found or not published');
  }

  // Get active team members only
  const activeMemberships = await db.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.teamId, eventType.teamId!),
      eq(teamMembers.status, 'active')
    ),
  });
  const activeUserIds = new Set(activeMemberships.map((m) => m.userId).filter(Boolean));

  // Eligible users who are active team members
  const eligibleUsers = eventType.teamEventMembers
    .map((tem) => tem.user)
    .filter((user) => user && activeUserIds.has(user.id));

  if (eligibleUsers.length === 0) {
    return { eventType, availableSlots: [], eligibleHosts: [] };
  }

  const allSlotsSet = new Set<number>();

  for (const host of eligibleUsers) {
    const rules = await db.query.availabilityRules.findMany({
      where: eq(availabilityRules.userId, host.id),
    });

    const searchEnd = addDays(now, host.bookingHorizonDays);

    const existingBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.userId, host.id),
        eq(bookings.status, 'confirmed'),
        gte(bookings.endTime, now),
        lte(bookings.startTime, searchEnd)
      ),
    });

    let externalBusyBlocks: { start: Date; end: Date }[] = [];
    try {
      externalBusyBlocks = await getExternalBusyBlocks(host.id, host.bookingHorizonDays);
    } catch (err) {
      console.warn(`Failed to fetch calendar busy blocks for user ${host.id}:`, err);
      // Fail safely if calendar check fails for host when checking
    }

    const defaultRules = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek: dayOfWeek as any,
      startTime: '09:00',
      endTime: '17:00',
    }));

    const activeRules = rules.length > 0
      ? rules.map((r) => ({
          dayOfWeek: r.dayOfWeek as any,
          startTime: r.startTime,
          endTime: r.endTime,
        }))
      : defaultRules;

    const config: SchedulingConfig = {
      timezone: host.timezone,
      bufferTimeMinutes: host.bufferTimeMinutes,
      noticePeriodHours: host.noticePeriodHours,
      bookingHorizonDays: host.bookingHorizonDays,
      rules: activeRules,
    };

    const hostSlots = calculateAvailableSlots(
      eventType.durationMinutes,
      config,
      existingBookings,
      externalBusyBlocks,
      now
    );

    for (const slot of hostSlots) {
      allSlotsSet.add(slot.getTime());
    }
  }

  const sortedSlots = Array.from(allSlotsSet)
    .sort((a, b) => a - b)
    .map((ts) => new Date(ts));

  return {
    eventType,
    availableSlots: sortedSlots,
    eligibleHosts: eligibleUsers,
  };
}

/**
 * Deterministic Fair Round-Robin Host Selection:
 * 1. Filter hosts available for slot (checks availability rules, buffer, notice, horizon, existing bookings, calendar conflicts).
 * 2. Order available hosts by:
 *    a) Total team bookings in the last 30 days (ascending)
 *    b) User ID string (alphabetical tie-breaker)
 */
export async function rankCandidateHostsForSlot(
  eventTypeId: string,
  startTime: Date,
  now: Date = new Date()
): Promise<any[]> {
  const eventType = await db.query.eventTypes.findFirst({
    where: eq(eventTypes.id, eventTypeId),
    with: {
      teamEventMembers: {
        with: {
          user: true,
        },
      },
    },
  });

  if (!eventType) {
    throw new Error('Event type not found');
  }

  const durationMinutes = eventType.durationMinutes;
  const endTime = addMinutes(startTime, durationMinutes);

  // Active team members
  const activeMemberships = await db.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.teamId, eventType.teamId!),
      eq(teamMembers.status, 'active')
    ),
  });
  const activeUserIds = new Set(activeMemberships.map((m) => m.userId).filter(Boolean));

  const eligibleUsers = eventType.teamEventMembers
    .map((tem) => tem.user)
    .filter((user) => user && activeUserIds.has(user.id));

  const availableHosts: { host: any; recentBookingCount: number }[] = [];
  const thirtyDaysAgo = subDays(now, 30);

  for (const host of eligibleUsers) {
    // Check if host is available at startTime
    const rules = await db.query.availabilityRules.findMany({
      where: eq(availabilityRules.userId, host.id),
    });

    const searchEnd = addDays(now, host.bookingHorizonDays);

    const existingBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.userId, host.id),
        eq(bookings.status, 'confirmed'),
        gte(bookings.endTime, now),
        lte(bookings.startTime, searchEnd)
      ),
    });

    let externalBusyBlocks: { start: Date; end: Date }[] = [];
    try {
      externalBusyBlocks = await getExternalBusyBlocks(host.id, host.bookingHorizonDays);
    } catch (err) {
      console.warn(`Calendar check failed for user ${host.id}:`, err);
    }

    const defaultRules = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek: dayOfWeek as any,
      startTime: '09:00',
      endTime: '17:00',
    }));

    const activeRules = rules.length > 0
      ? rules.map((r) => ({
          dayOfWeek: r.dayOfWeek as any,
          startTime: r.startTime,
          endTime: r.endTime,
        }))
      : defaultRules;

    const config: SchedulingConfig = {
      timezone: host.timezone,
      bufferTimeMinutes: host.bufferTimeMinutes,
      noticePeriodHours: host.noticePeriodHours,
      bookingHorizonDays: host.bookingHorizonDays,
      rules: activeRules,
    };

    const hostSlots = calculateAvailableSlots(
      durationMinutes,
      config,
      existingBookings,
      externalBusyBlocks,
      now
    );

    const isAvailable = hostSlots.some((s) => s.getTime() === startTime.getTime());

    if (isAvailable) {
      // Count recent bookings in past 30 days for fairness score
      const recentBookings = await db.query.bookings.findMany({
        where: and(
          eq(bookings.userId, host.id),
          eq(bookings.status, 'confirmed'),
          gte(bookings.createdAt, thirtyDaysAgo)
        ),
      });

      availableHosts.push({
        host,
        recentBookingCount: recentBookings.length,
      });
    }
  }

  // Sort by recentBookingCount ascending, then by host.id ascending
  availableHosts.sort((a, b) => {
    if (a.recentBookingCount !== b.recentBookingCount) {
      return a.recentBookingCount - b.recentBookingCount;
    }
    return a.host.id.localeCompare(b.host.id);
  });

  return availableHosts.map((ah) => ah.host);
}

/**
 * Creates a team booking with atomic round-robin assignment and retry on race conditions.
 */
export async function createTeamBooking(data: {
  eventTypeId: string;
  guestName: string;
  guestEmail: string;
  startTime: Date;
  guestTimezone: string;
}) {
  const startTime = new Date(data.startTime);
  const candidateHosts = await rankCandidateHostsForSlot(data.eventTypeId, startTime);

  if (candidateHosts.length === 0) {
    throw new Error('No available host found for the selected time slot.');
  }

  const eventType = await db.query.eventTypes.findFirst({
    where: eq(eventTypes.id, data.eventTypeId),
  });

  if (!eventType) {
    throw new Error('Event type not found');
  }

  const endTime = addMinutes(startTime, eventType.durationMinutes);

  // Try each host in priority order until successful atomic reservation
  for (const host of candidateHosts) {
    try {
      const result = await db.transaction(async (tx) => {
        // Atomic check inside transaction for overlapping confirmed booking for this host
        const overlapping = await tx.query.bookings.findFirst({
          where: and(
            eq(bookings.userId, host.id),
            eq(bookings.status, 'confirmed'),
            lt(bookings.startTime, endTime),
            gt(bookings.endTime, startTime)
          ),
        });

        if (overlapping) {
          throw new Error('SLOT_OCCUPIED_BY_CONCURRENT_BOOKING');
        }

        const managementToken = crypto.randomUUID();

        let initialMeetingUrl: string | null = null;
        let initialMeetingStatus: 'none' | 'pending' | 'ready' | 'failed' = 'none';

        if (eventType.location === 'google-meet') {
          initialMeetingStatus = 'pending';
        } else if (eventType.location?.startsWith('custom-link:')) {
          const urlPart = eventType.location.slice('custom-link:'.length).trim();
          initialMeetingUrl = urlPart || null;
          initialMeetingStatus = urlPart ? 'ready' : 'none';
        }

        const [inserted] = await tx
          .insert(bookings)
          .values({
            eventTypeId: data.eventTypeId,
            userId: host.id,
            guestName: data.guestName,
            guestEmail: data.guestEmail,
            startTime,
            endTime,
            guestTimezone: data.guestTimezone,
            managementToken,
            meetingUrl: initialMeetingUrl,
            meetingStatus: initialMeetingStatus,
          })
          .returning();

        // Queue notifications
        await tx.insert(outboxMessages).values([
          {
            type: 'GUEST_CONFIRMATION',
            payload: JSON.stringify({ bookingId: inserted.id }),
          },
          {
            type: 'HOST_NOTIFICATION',
            payload: JSON.stringify({ bookingId: inserted.id }),
          },
          {
            type: 'CALENDAR_SYNC_CREATE',
            payload: JSON.stringify({ bookingId: inserted.id }),
          },
        ]);

        return { booking: inserted, assignedHost: host };
      });

      // Trigger outbox processing
      const { processOutbox } = await import('../email');
      processOutbox().catch(console.error);

      return result;
    } catch (err: any) {
      if (err.message === 'SLOT_OCCUPIED_BY_CONCURRENT_BOOKING') {
        console.warn(`Host ${host.id} was taken concurrently. Retrying next host...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('This time slot is no longer available. All hosts are occupied.');
}
