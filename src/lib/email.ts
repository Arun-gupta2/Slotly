import { db } from './db';
import { outboxMessages, bookings, eventTypes, users, teams } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { format } from 'date-fns';
import { createGoogleEvent, deleteGoogleEvent } from './calendar';

/**
 * Mock email sender representing Resend / Nodemailer.
 * In a real environment, this would call resend.emails.send(...)
 */
async function sendEmailMock(to: string, subject: string, html: string) {
  console.log('----------------------------------------------------');
  console.log(`📧 MOCK EMAIL SENT TO: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body (HTML):\n${html}`);
  console.log('----------------------------------------------------');
  // Simulate network delay
  await new Promise(res => setTimeout(res, 500));
}

export async function processOutbox() {
  // Grab pending messages
  const pending = await db.query.outboxMessages.findMany({
    where: eq(outboxMessages.status, 'pending'),
    limit: 50,
  });

  for (const msg of pending) {
    try {
      const payload = JSON.parse(msg.payload);

      if (msg.type === 'TEAM_INVITATION') {
        const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/team/invite/${payload.rawToken}`;
        const team = await db.query.teams.findFirst({
          where: eq(teams.id, payload.teamId),
        });

        const teamName = team ? team.name : 'a team';
        const subject = `You've been invited to join ${teamName} on Slotly`;
        const html = `
          <h1>Team Invitation</h1>
          <p>You have been invited to join <strong>${teamName}</strong> on Slotly.</p>
          <p><a href="${inviteUrl}">Click here to accept or decline your invitation</a>.</p>
          <p>This invitation link will expire in 7 days.</p>
        `;
        await sendEmailMock(payload.email, subject, html);

        await db.update(outboxMessages)
          .set({ status: 'sent', processedAt: new Date() })
          .where(eq(outboxMessages.id, msg.id));
        continue;
      }
      
      // Fetch related data for bookings
      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, payload.bookingId),
        with: {
          eventType: {
            with: {
              user: true // The host
            }
          }
        }
      });

      if (!booking || !booking.eventType || !booking.eventType.user) {
        throw new Error('Booking or host not found for email notification');
      }

      const host = booking.eventType.user;
      const eventName = booking.eventType.name;
      const guestName = booking.guestName;
      const guestEmail = booking.guestEmail;
      
      const timeStr = `${format(booking.startTime, 'MMM d, yyyy h:mm a')} - ${format(booking.endTime, 'h:mm a')}`;
      const managementUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/manage-booking/${booking.managementToken}`;

      const renderMeetingInfo = (b: typeof booking) => {
        if (b.meetingStatus === 'ready' && b.meetingUrl) {
          return `
            <div style="margin: 16px 0; padding: 12px 16px; background-color: #EEF2FF; border-left: 4px solid #4359E8; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1E1B4B;">📹 Video Meeting Link:</p>
              <p style="margin: 6px 0 0 0;"><a href="${b.meetingUrl}" style="color: #4359E8; font-weight: 600; word-break: break-all;">${b.meetingUrl}</a></p>
            </div>
          `;
        }
        if (b.meetingStatus === 'pending') {
          return `
            <div style="margin: 16px 0; padding: 12px 16px; background-color: #FEF3C7; border-left: 4px solid #D97706; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #92400E;">⏳ Google Meet link is being generated...</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #78350F;">The video link is pending conference creation and will appear in your calendar invite and management page shortly.</p>
            </div>
          `;
        }
        if (b.meetingStatus === 'failed') {
          return `
            <div style="margin: 16px 0; padding: 12px 16px; background-color: #FEE2E2; border-left: 4px solid #DC2626; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #991B1B;">⚠️ Video Meeting Notice</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #7F1D1D;">Automatic video conference link generation could not be completed. Your host will provide meeting details directly.</p>
            </div>
          `;
        }
        if (b.eventType?.location && b.eventType.location !== 'google-meet') {
          const loc = b.eventType.location;
          const display = loc.startsWith('custom-link:') ? loc.slice('custom-link:'.length) : loc === 'phone' ? 'Phone call' : loc === 'in-person' ? 'In person' : loc;
          return `
            <p><strong>Location / Meeting Info:</strong> ${display}</p>
          `;
        }
        return '';
      };

      if (msg.type === 'GUEST_CONFIRMATION') {
        const subject = `Confirmed: ${eventName} with ${host.name}`;
        const meetingHtml = renderMeetingInfo(booking);
        const html = `
          <h1>Booking Confirmed</h1>
          <p>Hi ${guestName},</p>
          <p>Your meeting <strong>${eventName}</strong> with ${host.name} is confirmed for:</p>
          <p><strong>${timeStr} (${booking.guestTimezone})</strong></p>
          ${meetingHtml}
          <p>Need to make changes? <a href="${managementUrl}">Click here to reschedule or cancel</a>.</p>
        `;
        await sendEmailMock(guestEmail, subject, html);
      } 
      else if (msg.type === 'HOST_NOTIFICATION') {
        const subject = `New Booking: ${eventName} with ${guestName}`;
        const meetingHtml = renderMeetingInfo(booking);
        const html = `
          <h1>New Booking Received</h1>
          <p>Hi ${host.name},</p>
          <p><strong>${guestName}</strong> (${guestEmail}) has booked <strong>${eventName}</strong> for:</p>
          <p><strong>${timeStr}</strong></p>
          ${meetingHtml}
          <p>You can manage this in your <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/bookings">Slotly Dashboard</a>.</p>
        `;
        await sendEmailMock(host.email, subject, html);
      }
      else if (msg.type === 'TEAM_INVITATION') {
        const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/team/invite/${payload.rawToken}`;
        const team = await db.query.teams.findFirst({
          where: eq(teams.id, payload.teamId),
        });

        const teamName = team ? team.name : 'a team';
        const subject = `You've been invited to join ${teamName} on Slotly`;
        const html = `
          <h1>Team Invitation</h1>
          <p>You have been invited to join <strong>${teamName}</strong> on Slotly.</p>
          <p><a href="${inviteUrl}">Click here to accept or decline your invitation</a>.</p>
          <p>This invitation link will expire in 7 days.</p>
        `;
        await sendEmailMock(payload.email, subject, html);
      }
      else if (msg.type === 'CANCELLATION') {
        const cancelledBy = payload.cancelledBy;
        
        // Notify the OTHER party
        if (cancelledBy === 'host') {
          const subject = `Cancelled: ${eventName} with ${host.name}`;
          const html = `
            <h1>Booking Cancelled</h1>
            <p>Hi ${guestName},</p>
            <p>Unfortunately, your meeting <strong>${eventName}</strong> on ${timeStr} has been cancelled by the host.</p>
          `;
          await sendEmailMock(guestEmail, subject, html);
        } else {
          const subject = `Cancelled: ${eventName} with ${guestName}`;
          const html = `
            <h1>Booking Cancelled</h1>
            <p>Hi ${host.name},</p>
            <p>Your meeting <strong>${eventName}</strong> on ${timeStr} was cancelled by the guest.</p>
          `;
          await sendEmailMock(host.email, subject, html);
        }
      }
      else if (msg.type === 'CALENDAR_SYNC_CREATE') {
        // If event already created, avoid duplicate creation during retries
        if (booking.googleEventId) {
          if (booking.meetingStatus === 'pending') {
            const { fetchGoogleEventConference } = await import('./calendar');
            const conf = await fetchGoogleEventConference(booking.userId, booking.googleEventId);
            if (conf?.meetUrl) {
              await db.update(bookings)
                .set({ meetingUrl: conf.meetUrl, meetingStatus: 'ready' })
                .where(eq(bookings.id, booking.id));
            } else if (conf?.conferenceStatus === 'failed') {
              await db.update(bookings)
                .set({ meetingStatus: 'failed' })
                .where(eq(bookings.id, booking.id));
            }
          }
        } else {
          const isGoogleMeet = booking.eventType.location === 'google-meet';
          const calendarResult = await createGoogleEvent(booking.userId, {
            summary: `${eventName} with ${guestName}`,
            description: `Guest Email: ${guestEmail}\n\nManage Booking: ${managementUrl}`,
            start: booking.startTime,
            end: booking.endTime,
            timezone: host.timezone,
            createMeet: isGoogleMeet,
            conferenceRequestId: booking.id,
          });

          if (calendarResult) {
            const updateFields: any = {
              googleEventId: calendarResult.googleEventId,
            };

            if (isGoogleMeet) {
              if (calendarResult.meetUrl) {
                updateFields.meetingUrl = calendarResult.meetUrl;
                updateFields.meetingStatus = 'ready';
              } else if (calendarResult.conferenceStatus === 'failed') {
                updateFields.meetingStatus = 'failed';
              } else {
                updateFields.meetingStatus = 'pending';
              }
            }

            await db.update(bookings)
              .set(updateFields)
              .where(eq(bookings.id, booking.id));
          } else if (isGoogleMeet && booking.meetingStatus === 'pending') {
            // Calendar connection missing or request failed
            await db.update(bookings)
              .set({ meetingStatus: 'failed' })
              .where(eq(bookings.id, booking.id));
          }
        }
      }
      else if (msg.type === 'CALENDAR_SYNC_DELETE') {
        if (booking.googleEventId) {
          await deleteGoogleEvent(booking.userId, booking.googleEventId);
        }
      }

      // Mark as processed
      await db.update(outboxMessages)
        .set({ status: 'processed', processedAt: new Date() })
        .where(eq(outboxMessages.id, msg.id));

    } catch (err: any) {
      console.error('Failed to process outbox message', msg.id, err);
      await db.update(outboxMessages)
        .set({ status: 'failed', error: err.message })
        .where(eq(outboxMessages.id, msg.id));
    }
  }
}

