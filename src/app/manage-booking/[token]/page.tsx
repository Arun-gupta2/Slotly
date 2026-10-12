import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { bookings, eventTypes, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import GuestManageBooking from './GuestManageBooking';

type Params = {
  token: string;
};

export default async function ManageBookingPage({ params }: { params: Params }) {
  const { token } = params;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.managementToken, token),
    with: {
      eventType: {
        with: {
          user: true
        }
      }
    }
  });

  if (!booking) {
    notFound();
  }

  const payload = {
    id: booking.id,
    token: booking.managementToken,
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    guestTimezone: booking.guestTimezone,
    eventName: booking.eventType?.name ?? 'Meeting',
    hostName: booking.eventType?.user?.name ?? 'Host',
    meetingUrl: booking.meetingUrl,
    meetingStatus: booking.meetingStatus,
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
      <GuestManageBooking booking={payload} />
    </div>
  );
}
