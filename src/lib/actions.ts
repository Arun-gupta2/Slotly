'use server';

import { db, ensureTablesExist } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';

export async function getSessionUser() {
  await ensureTablesExist();
  const session = await getServerSession(authOptions);
  
  if (!session?.user || !(session.user as any).id) {
    throw new Error('Not authenticated');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, (session.user as any).id),
  });

  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

export async function updateAvailabilitySettings(data: {
  timezone: string;
  bufferTimeMinutes: number;
  noticePeriodHours: number;
  bookingHorizonDays: number;
  rules: { dayOfWeek: number; startTime: string; endTime: string }[];
}) {
  const user = await getSessionUser();

  await db.transaction(async (tx) => {
    // Update user settings
    await tx.update(users)
      .set({
        timezone: data.timezone,
        bufferTimeMinutes: data.bufferTimeMinutes,
        noticePeriodHours: data.noticePeriodHours,
        bookingHorizonDays: data.bookingHorizonDays,
      })
      .where(eq(users.id, user.id));

    // Replace rules
    const { availabilityRules } = await import('./db/schema');
    await tx.delete(availabilityRules).where(eq(availabilityRules.userId, user.id));
    
    if (data.rules.length > 0) {
      await tx.insert(availabilityRules).values(
        data.rules.map(r => ({
          userId: user.id,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        }))
      );
    }
  });

  revalidatePath('/dashboard/availability');
}

export async function getAvailabilitySettings() {
  const user = await getSessionUser();
  const { availabilityRules } = await import('./db/schema');
  
  const rules = await db.query.availabilityRules.findMany({
    where: eq(availabilityRules.userId, user.id),
  });

  return {
    timezone: user.timezone,
    bufferTimeMinutes: user.bufferTimeMinutes,
    noticePeriodHours: user.noticePeriodHours,
    bookingHorizonDays: user.bookingHorizonDays,
    rules: rules.map(r => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
    })),
  };
}

export async function createBooking(data: {
  eventTypeId: string;
  userId: string;
  guestName: string;
  guestEmail: string;
  startTime: Date | string;
  endTime: Date | string;
  guestTimezone: string;
}) {
  const { bookings, users, eventTypes } = await import('./db/schema');
  const { and, eq, lt, gt } = await import('drizzle-orm');

  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  // Use a transaction to prevent double bookings
  let hostSlug = '';
  let eventSlug = '';
  let createdBookingId = '';
  let createdManagementToken = '';
  let createdMeetingUrl: string | null = null;
  let createdMeetingStatus: 'none' | 'pending' | 'ready' | 'failed' = 'none';

  await db.transaction(async (tx) => {
    // 1. Check for overlapping confirmed bookings for this user
    // Two intervals [A, B] and [C, D] overlap if and only if A < D and B > C
    const overlapping = await tx.query.bookings.findFirst({
      where: and(
        eq(bookings.userId, data.userId),
        eq(bookings.status, 'confirmed'),
        lt(bookings.startTime, end),
        gt(bookings.endTime, start)
      ),
    });

    if (overlapping) {
      throw new Error('This time slot is no longer available.');
    }

    const managementToken = crypto.randomUUID();

    // Fetch user and event type slugs for revalidation and location determination
    const hostUser = await tx.query.users.findFirst({
      where: eq(users.id, data.userId),
    });
    const evType = await tx.query.eventTypes.findFirst({
      where: eq(eventTypes.id, data.eventTypeId),
    });
    if (hostUser) hostSlug = hostUser.username;
    if (evType) eventSlug = evType.slug;

    let initialMeetingUrl: string | null = null;
    let initialMeetingStatus: 'none' | 'pending' | 'ready' | 'failed' = 'none';

    if (evType?.location === 'google-meet') {
      initialMeetingStatus = 'pending';
    } else if (evType?.location?.startsWith('custom-link:')) {
      const urlPart = evType.location.slice('custom-link:'.length).trim();
      initialMeetingUrl = urlPart || null;
      initialMeetingStatus = urlPart ? 'ready' : 'none';
    }

    // 2. Insert the booking
    const [inserted] = await tx.insert(bookings).values({
      eventTypeId: data.eventTypeId,
      userId: data.userId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      startTime: start,
      endTime: end,
      guestTimezone: data.guestTimezone,
      managementToken,
      meetingUrl: initialMeetingUrl,
      meetingStatus: initialMeetingStatus,
    }).returning();

    createdBookingId = inserted.id;
    createdManagementToken = inserted.managementToken;
    createdMeetingUrl = inserted.meetingUrl;
    createdMeetingStatus = inserted.meetingStatus as any;

    // 3. Queue emails via Outbox Pattern
    const { outboxMessages } = await import('./db/schema');
    
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
      }
    ]);
  });

  // Revalidate public booking and dashboard paths
  if (hostSlug && eventSlug) {
    revalidatePath(`/book/${hostSlug}/${eventSlug}`);
    revalidatePath(`/book/${hostSlug}`);
  }
  revalidatePath('/dashboard/bookings');
  revalidatePath('/dashboard');

  // Asynchronously trigger outbox processing
  const { processOutbox } = await import('./email');
  processOutbox().catch(console.error);

  return {
    bookingId: createdBookingId,
    managementToken: createdManagementToken,
    meetingUrl: createdMeetingUrl,
    meetingStatus: createdMeetingStatus,
  };
}

export async function updateAccountSettings(data: {
  name: string;
  username: string;
  bio: string;
  timezone: string;
}) {
  const user = await getSessionUser();
  const { eq, and, ne } = await import('drizzle-orm');
  
  if (data.username !== user.username) {
    const collision = await db.query.users.findFirst({
      where: eq(users.username, data.username),
    });
    if (collision) {
      throw new Error('Username is already taken');
    }
  }

  await db.update(users)
    .set({
      name: data.name,
      username: data.username,
      bio: data.bio,
      timezone: data.timezone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
}

export async function getHostBookings() {
  const user = await getSessionUser();
  const { bookings, eventTypes } = await import('./db/schema');
  
  const records = await db
    .select({
      id: bookings.id,
      guestName: bookings.guestName,
      guestEmail: bookings.guestEmail,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      guestTimezone: bookings.guestTimezone,
      status: bookings.status,
      meetingUrl: bookings.meetingUrl,
      meetingStatus: bookings.meetingStatus,
      location: eventTypes.location,
      eventName: eventTypes.name,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(eventTypes, eq(bookings.eventTypeId, eventTypes.id))
    .where(eq(bookings.userId, user.id))
    .orderBy((table) => [table.startTime]);

  return records;
}

export async function cancelBooking(bookingId: string) {
  const user = await getSessionUser();
  const { bookings, outboxMessages } = await import('./db/schema');
  const { and } = await import('drizzle-orm');

  await db.transaction(async (tx) => {
    const [cancelled] = await tx
      .update(bookings)
      .set({ status: 'cancelled' })
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, user.id)))
      .returning();

    if (!cancelled) {
      throw new Error('Booking not found or already cancelled');
    }

    await tx.insert(outboxMessages).values([
      {
        type: 'CANCELLATION',
        payload: JSON.stringify({ bookingId: cancelled.id, cancelledBy: 'host' }),
      },
      {
        type: 'CALENDAR_SYNC_DELETE',
        payload: JSON.stringify({ bookingId: cancelled.id }),
      }
    ]);
  });
  
  // Asynchronously trigger outbox processing
  const { processOutbox } = await import('./email');
  processOutbox().catch(console.error);

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/dashboard/bookings');
  revalidatePath('/dashboard');
}

export async function guestCancelBooking(token: string) {
  const { bookings, outboxMessages } = await import('./db/schema');
  const { eq } = await import('drizzle-orm');

  await db.transaction(async (tx) => {
    const [cancelled] = await tx
      .update(bookings)
      .set({ status: 'cancelled' })
      .where(eq(bookings.managementToken, token))
      .returning();

    if (!cancelled) {
      throw new Error('Booking not found');
    }

    await tx.insert(outboxMessages).values([
      {
        type: 'CANCELLATION',
        payload: JSON.stringify({ bookingId: cancelled.id, cancelledBy: 'guest' }),
      },
      {
        type: 'CALENDAR_SYNC_DELETE',
        payload: JSON.stringify({ bookingId: cancelled.id }),
      }
    ]);
  });
  
  const { processOutbox } = await import('./email');
  processOutbox().catch(console.error);
}

// ── Calendar Connection Actions ───────────────────────────────────────────

export async function getCalendarConnection() {
  const user = await getSessionUser();
  const { calendarConnections } = await import('./db/schema');
  
  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, user.id),
  });

  if (!connection) return null;

  return {
    id: connection.id,
    email: connection.googleAccountEmail,
    syncEvents: connection.syncEvents,
    createdAt: connection.createdAt,
  };
}

export async function disconnectCalendar() {
  const user = await getSessionUser();
  const { calendarConnections } = await import('./db/schema');
  
  await db.delete(calendarConnections).where(eq(calendarConnections.userId, user.id));
  
  const { revalidatePath } = await import('next/cache');
  revalidatePath('/dashboard/settings/calendar');
}
