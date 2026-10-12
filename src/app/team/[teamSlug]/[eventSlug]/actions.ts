'use server';

import { createTeamBooking } from '@/lib/scheduling/team-engine';
import { revalidatePath } from 'next/cache';

export async function createTeamBookingAction(data: {
  eventTypeId: string;
  guestName: string;
  guestEmail: string;
  startTimeIso: string;
  guestTimezone: string;
}) {
  const result = await createTeamBooking({
    eventTypeId: data.eventTypeId,
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    startTime: new Date(data.startTimeIso),
    guestTimezone: data.guestTimezone,
  });

  revalidatePath('/dashboard/bookings');
  revalidatePath('/dashboard');

  return {
    bookingId: result.booking.id,
    managementToken: result.booking.managementToken,
    meetingUrl: result.booking.meetingUrl,
    meetingStatus: result.booking.meetingStatus,
    assignedHost: {
      name: result.assignedHost.name,
      email: result.assignedHost.email,
    },
  };
}
