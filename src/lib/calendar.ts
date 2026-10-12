import { db } from './db';
import { calendarConnections } from './db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from './encryption';
import { addDays, formatRFC3339 } from 'date-fns';

async function getAccessToken(userId: string) {
  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, userId),
  });

  if (!connection) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = decrypt(connection.encryptedRefreshToken);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  
  if (!res.ok) {
    if (data.error === 'invalid_grant') {
      // Refresh token revoked or expired
      await db.delete(calendarConnections).where(eq(calendarConnections.userId, userId));
    }
    console.error('Google token refresh failed:', data);
    return null;
  }

  return data.access_token;
}

export async function getExternalBusyBlocks(userId: string, horizonDays: number): Promise<{ start: Date; end: Date }[]> {
  // If no credentials, gracefully skip
  if (!process.env.GOOGLE_CLIENT_ID) return [];

  const token = await getAccessToken(userId);
  if (!token) return [];

  const now = new Date();
  const timeMin = formatRFC3339(now);
  const timeMax = formatRFC3339(addDays(now, horizonDays));

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: 'primary' }],
      }),
    });

    if (!res.ok) {
      console.error('Failed to fetch Google freebusy');
      return []; // Return empty so we don't break booking entirely on transient failure
    }

    const data = await res.json();
    const busy = data.calendars?.primary?.busy || [];

    return busy.map((block: { start: string; end: string }) => ({
      start: new Date(block.start),
      end: new Date(block.end),
    }));
  } catch (err) {
    console.error('FreeBusy check failed', err);
    return [];
  }
}

export interface CreateCalendarEventResult {
  googleEventId: string;
  meetUrl: string | null;
  conferenceStatus: 'ready' | 'pending' | 'failed' | 'none';
}

export async function createGoogleEvent(
  userId: string,
  payload: {
    summary: string;
    description: string;
    start: Date;
    end: Date;
    timezone: string;
    createMeet?: boolean;
    conferenceRequestId?: string;
  }
): Promise<CreateCalendarEventResult | null> {
  const token = await getAccessToken(userId);
  if (!token) return null;

  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    if (payload.createMeet) {
      url.searchParams.set('conferenceDataVersion', '1');
    }

    const eventBody: any = {
      summary: payload.summary,
      description: payload.description,
      start: {
        dateTime: formatRFC3339(payload.start),
        timeZone: payload.timezone,
      },
      end: {
        dateTime: formatRFC3339(payload.end),
        timeZone: payload.timezone,
      },
    };

    if (payload.createMeet) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: payload.conferenceRequestId || crypto.randomUUID(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      };
    }

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!res.ok) {
      console.error('Failed to create google event', await res.text());
      return null;
    }

    const data = await res.json();
    const eventId = data.id;

    if (!payload.createMeet) {
      return {
        googleEventId: eventId,
        meetUrl: null,
        conferenceStatus: 'none',
      };
    }

    // Extract conference data if available
    const meetUri =
      data.hangoutLink ||
      data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ||
      null;

    const createStatusCode = data.conferenceData?.createRequest?.status?.statusCode;

    let confStatus: 'ready' | 'pending' | 'failed' = 'pending';
    if (meetUri && (!createStatusCode || createStatusCode === 'success')) {
      confStatus = 'ready';
    } else if (createStatusCode === 'failure') {
      confStatus = 'failed';
    } else {
      confStatus = 'pending';
    }

    return {
      googleEventId: eventId,
      meetUrl: meetUri,
      conferenceStatus: confStatus,
    };
  } catch (err) {
    console.error('Create Google Event error', err);
    return null;
  }
}

export async function fetchGoogleEventConference(
  userId: string,
  eventId: string
): Promise<{ meetUrl: string | null; conferenceStatus: 'ready' | 'pending' | 'failed' } | null> {
  const token = await getAccessToken(userId);
  if (!token) return null;

  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error('Failed to fetch google event', await res.text());
      return null;
    }

    const data = await res.json();
    const meetUri =
      data.hangoutLink ||
      data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ||
      null;

    const createStatusCode = data.conferenceData?.createRequest?.status?.statusCode;

    if (meetUri) {
      return { meetUrl: meetUri, conferenceStatus: 'ready' };
    }
    if (createStatusCode === 'failure') {
      return { meetUrl: null, conferenceStatus: 'failed' };
    }
    return { meetUrl: null, conferenceStatus: 'pending' };
  } catch (err) {
    console.error('Fetch Google Event conference error', err);
    return null;
  }
}

export async function deleteGoogleEvent(userId: string, eventId: string) {
  const token = await getAccessToken(userId);
  if (!token) return;

  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!res.ok) {
      console.error('Failed to delete google event', await res.text());
    }
  } catch (err) {
    console.error('Delete Google Event error', err);
  }
}
