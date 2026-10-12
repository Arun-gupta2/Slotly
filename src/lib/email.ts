import { db } from './db';
import { outboxMessages, bookings, eventTypes, users, teams } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { format } from 'date-fns';
import { createGoogleEvent, deleteGoogleEvent } from './calendar';

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const DEFAULT_FROM = process.env.EMAIL_FROM || 'Slotly <onboarding@resend.dev>';

/**
 * Sends an email using Resend if RESEND_API_KEY is configured.
 * Falls back to console logging if the key is missing.
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = DEFAULT_FROM,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  if (resend) {
    try {
      const response = await resend.emails.send({
        from,
        to: [to],
        subject,
        html,
      });

      if (response.error) {
        console.error(`❌ Resend email dispatch failed to [${to}]:`, response.error);
        throw new Error(`Resend dispatch error: ${response.error.message}`);
      }

      console.log(`📧 [Resend] Successfully delivered email to ${to} (Message ID: ${response.data?.id})`);
      return response.data;
    } catch (err: any) {
      console.error(`❌ Error delivering email via Resend to ${to}:`, err);
      throw err;
    }
  } else {
    console.log('----------------------------------------------------');
    console.log(`📧 [MOCK EMAIL - No RESEND_API_KEY set] TO: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (HTML):\n${html}`);
    console.log('----------------------------------------------------');
  }
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
        const { getBaseUrl } = await import('./url');
        const inviteUrl = `${getBaseUrl()}/team/invite/${payload.rawToken}`;
        const team = await db.query.teams.findFirst({
          where: eq(teams.id, payload.teamId),
        });

        const teamName = team ? team.name : 'a team';
        const subject = `You've been invited to join ${teamName} on Slotly`;
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1E293B;">
            <h1 style="color: #0F172A; font-size: 22px; font-weight: 700; margin-bottom: 16px;">Team Invitation</h1>
            <p style="font-size: 15px; line-height: 1.5;">You have been invited to join <strong>${teamName}</strong> on Slotly.</p>
            <p style="margin: 20px 0;"><a href="${inviteUrl}" style="background-color: #4F46E5; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Accept or Decline Invitation</a></p>
            <p style="font-size: 13px; color: #64748B;">This invitation link will expire in 7 days.</p>
          </div>
        `;
        await sendEmail({ to: payload.email, subject, html });

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
      
      const { getBaseUrl } = await import('./url');
      const baseUrl = getBaseUrl();
      const timeStr = `${format(booking.startTime, 'MMM d, yyyy h:mm a')} - ${format(booking.endTime, 'h:mm a')}`;
      const managementUrl = `${baseUrl}/manage-booking/${booking.managementToken}`;

      const renderMeetingInfo = (b: typeof booking) => {
        if (b.meetingStatus === 'ready' && b.meetingUrl) {
          return `
            <div style="margin: 16px 0; padding: 14px 18px; background-color: #EEF2FF; border-left: 4px solid #4F46E5; border-radius: 6px;">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1E1B4B;">📹 Video Meeting Link:</p>
              <p style="margin: 6px 0 0 0;"><a href="${b.meetingUrl}" style="color: #4F46E5; font-weight: 600; word-break: break-all;">${b.meetingUrl}</a></p>
            </div>
          `;
        }
        if (b.meetingStatus === 'pending') {
          return `
            <div style="margin: 16px 0; padding: 14px 18px; background-color: #FEF3C7; border-left: 4px solid #D97706; border-radius: 6px;">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #92400E;">⏳ Google Meet link is being generated...</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #78350F;">The video link is pending conference creation and will appear in your calendar invite and management page shortly.</p>
            </div>
          `;
        }
        if (b.meetingStatus === 'failed') {
          return `
            <div style="margin: 16px 0; padding: 14px 18px; background-color: #FEE2E2; border-left: 4px solid #DC2626; border-radius: 6px;">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #991B1B;">⚠️ Video Meeting Notice</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #7F1D1D;">Automatic video conference link generation could not be completed. Your host will provide meeting details directly.</p>
            </div>
          `;
        }
        if (b.eventType?.location && b.eventType.location !== 'google-meet') {
          const loc = b.eventType.location;
          const display = loc.startsWith('custom-link:') ? loc.slice('custom-link:'.length) : loc === 'phone' ? 'Phone call' : loc === 'in-person' ? 'In person' : loc;
          return `
            <div style="margin: 16px 0; padding: 14px 18px; background-color: #F8FAFC; border-left: 4px solid #64748B; border-radius: 6px;">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #334155;">📍 Location / Details:</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #0F172A;">${display}</p>
            </div>
          `;
        }
        return '';
      };

      if (msg.type === 'GUEST_CONFIRMATION') {
        const subject = `Confirmed: ${eventName} with ${host.name}`;
        const meetingHtml = renderMeetingInfo(booking);
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1E293B;">
            <h1 style="color: #0F172A; font-size: 22px; font-weight: 700; margin-bottom: 16px;">Booking Confirmed</h1>
            <p style="font-size: 15px; line-height: 1.5;">Hi <strong>${guestName}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.5;">Your meeting <strong>${eventName}</strong> with <strong>${host.name}</strong> is confirmed for:</p>
            <div style="margin: 16px 0; padding: 14px 18px; background-color: #F8FAFC; border-radius: 6px; border: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0F172A;">🗓️ ${timeStr} (${booking.guestTimezone})</p>
            </div>
            ${meetingHtml}
            <p style="font-size: 14px; color: #64748B; margin-top: 24px;">Need to make changes? <a href="${managementUrl}" style="color: #4F46E5; font-weight: 500;">Click here to reschedule or cancel</a>.</p>
          </div>
        `;
        await sendEmail({ to: guestEmail, subject, html });
      } 
      else if (msg.type === 'HOST_NOTIFICATION') {
        const subject = `New Booking: ${eventName} with ${guestName}`;
        const meetingHtml = renderMeetingInfo(booking);
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1E293B;">
            <h1 style="color: #0F172A; font-size: 22px; font-weight: 700; margin-bottom: 16px;">New Booking Received</h1>
            <p style="font-size: 15px; line-height: 1.5;">Hi <strong>${host.name}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.5;"><strong>${guestName}</strong> (<a href="mailto:${guestEmail}" style="color: #4F46E5;">${guestEmail}</a>) has booked <strong>${eventName}</strong> for:</p>
            <div style="margin: 16px 0; padding: 14px 18px; background-color: #F8FAFC; border-radius: 6px; border: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0F172A;">🗓️ ${timeStr}</p>
            </div>
            ${meetingHtml}
            <p style="font-size: 14px; color: #64748B; margin-top: 24px;">You can view and manage this in your <a href="${baseUrl}/dashboard/bookings" style="color: #4F46E5; font-weight: 500;">Slotly Dashboard</a>.</p>
          </div>
        `;
        await sendEmail({ to: host.email, subject, html });
      }
      else if (msg.type === 'CANCELLATION') {
        const cancelledBy = payload.cancelledBy;
        
        // Notify the OTHER party
        if (cancelledBy === 'host') {
          const subject = `Cancelled: ${eventName} with ${host.name}`;
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1E293B;">
              <h1 style="color: #DC2626; font-size: 22px; font-weight: 700; margin-bottom: 16px;">Booking Cancelled</h1>
              <p style="font-size: 15px; line-height: 1.5;">Hi <strong>${guestName}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.5;">Your meeting <strong>${eventName}</strong> scheduled for <strong>${timeStr}</strong> has been cancelled by the host.</p>
            </div>
          `;
          await sendEmail({ to: guestEmail, subject, html });
        } else {
          const subject = `Cancelled: ${eventName} with ${guestName}`;
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1E293B;">
              <h1 style="color: #DC2626; font-size: 22px; font-weight: 700; margin-bottom: 16px;">Booking Cancelled</h1>
              <p style="font-size: 15px; line-height: 1.5;">Hi <strong>${host.name}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.5;">Your meeting <strong>${eventName}</strong> scheduled for <strong>${timeStr}</strong> was cancelled by the guest.</p>
            </div>
          `;
          await sendEmail({ to: host.email, subject, html });
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

