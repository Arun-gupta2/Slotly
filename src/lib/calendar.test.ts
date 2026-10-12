import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGoogleEvent, fetchGoogleEventConference } from './calendar';
import { db } from './db';
import { outboxMessages, bookings, calendarConnections } from './db/schema';
import { processOutbox } from './email';

// Mock Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Google Meet & Calendar Integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  });

  it('creates a Google Calendar event with conferenceData request when createMeet is true', async () => {
    // Mock db.query.calendarConnections.findFirst
    vi.spyOn(db.query.calendarConnections, 'findFirst').mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      encryptedRefreshToken: 'enc-token',
    } as any);

    // Mock encryption decrypt
    vi.mock('./encryption', () => ({
      decrypt: vi.fn().mockReturnValue('decrypted-refresh-token'),
      encrypt: vi.fn().mockReturnValue('encrypted-token'),
    }));

    let requestBody: any = null;
    let requestUrl: string = '';

    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'mock-google-access-token' }),
        } as any;
      }
      if (url.includes('calendars/primary/events')) {
        requestUrl = url;
        requestBody = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({
            id: 'g-event-123',
            hangoutLink: 'https://meet.google.com/abc-defg-hij',
            conferenceData: {
              entryPoints: [
                { entryPointType: 'video', uri: 'https://meet.google.com/abc-defg-hij' }
              ],
              createRequest: {
                status: { statusCode: 'success' }
              }
            }
          }),
        } as any;
      }
      return { ok: false, text: async () => 'Not found' } as any;
    });

    const result = await createGoogleEvent('user-1', {
      summary: '30 Min Meeting with Alice',
      description: 'Notes',
      start: new Date('2026-10-15T10:00:00Z'),
      end: new Date('2026-10-15T10:30:00Z'),
      timezone: 'UTC',
      createMeet: true,
      conferenceRequestId: 'booking-req-123',
    });

    expect(result).not.toBeNull();
    expect(result?.googleEventId).toBe('g-event-123');
    expect(result?.meetUrl).toBe('https://meet.google.com/abc-defg-hij');
    expect(result?.conferenceStatus).toBe('ready');

    // Verify conferenceData was sent in request
    expect(requestUrl).toContain('conferenceDataVersion=1');
    expect(requestBody.conferenceData).toBeDefined();
    expect(requestBody.conferenceData.createRequest.requestId).toBe('booking-req-123');
    expect(requestBody.conferenceData.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet');
  });

  it('handles pending conference creation truthfully without fabricated URL', async () => {
    vi.spyOn(db.query.calendarConnections, 'findFirst').mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      encryptedRefreshToken: 'enc-token',
    } as any);

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'mock-google-access-token' }),
        } as any;
      }
      if (url.includes('calendars/primary/events')) {
        return {
          ok: true,
          json: async () => ({
            id: 'g-event-456',
            // No hangoutLink yet
            conferenceData: {
              createRequest: {
                status: { statusCode: 'pending' }
              }
            }
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    const result = await createGoogleEvent('user-1', {
      summary: 'Pending Meet Meeting',
      description: 'Notes',
      start: new Date('2026-10-15T10:00:00Z'),
      end: new Date('2026-10-15T10:30:00Z'),
      timezone: 'UTC',
      createMeet: true,
      conferenceRequestId: 'booking-pending-456',
    });

    expect(result).not.toBeNull();
    expect(result?.googleEventId).toBe('g-event-456');
    expect(result?.meetUrl).toBeNull();
    expect(result?.conferenceStatus).toBe('pending');
  });

  it('fetches updated conference data when polling/retrying', async () => {
    vi.spyOn(db.query.calendarConnections, 'findFirst').mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      encryptedRefreshToken: 'enc-token',
    } as any);

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'mock-google-access-token' }),
        } as any;
      }
      if (url.includes('calendars/primary/events/g-event-456')) {
        return {
          ok: true,
          json: async () => ({
            id: 'g-event-456',
            hangoutLink: 'https://meet.google.com/xyz-uvwx-rst',
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    const updatedConf = await fetchGoogleEventConference('user-1', 'g-event-456');
    expect(updatedConf).not.toBeNull();
    expect(updatedConf?.meetUrl).toBe('https://meet.google.com/xyz-uvwx-rst');
    expect(updatedConf?.conferenceStatus).toBe('ready');
  });

  it('does not create video conferences for non-video bookings (in-person, phone)', async () => {
    vi.spyOn(db.query.calendarConnections, 'findFirst').mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      encryptedRefreshToken: 'enc-token',
    } as any);

    let sentBody: any = null;
    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'mock-google-access-token' }),
        } as any;
      }
      if (url.includes('calendars/primary/events')) {
        sentBody = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({ id: 'g-event-789' }),
        } as any;
      }
      return { ok: false } as any;
    });

    const result = await createGoogleEvent('user-1', {
      summary: 'In-person Meeting',
      description: 'Office 402',
      start: new Date('2026-10-15T11:00:00Z'),
      end: new Date('2026-10-15T11:30:00Z'),
      timezone: 'UTC',
      createMeet: false,
    });

    expect(result?.googleEventId).toBe('g-event-789');
    expect(result?.meetUrl).toBeNull();
    expect(result?.conferenceStatus).toBe('none');
    expect(sentBody.conferenceData).toBeUndefined();
  });
});
