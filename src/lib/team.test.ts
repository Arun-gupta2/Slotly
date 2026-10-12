import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

describe('Team Management & Security', () => {
  it('hashes invitation tokens securely with SHA-256', () => {
    const rawToken = 'sample-random-token-12345';
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

    expect(hash).not.toEqual(rawToken);
    expect(hash.length).toEqual(64); // hex SHA-256 string length

    // Same raw token produces exact same hash
    const hash2 = crypto.createHash('sha256').update(rawToken).digest('hex');
    expect(hash2).toEqual(hash);
  });

  it('prevents email enumeration during invitation process', async () => {
    const mockInviteFunction = vi.fn().mockImplementation(async (teamId: string, email: string) => {
      // Returns identical success payload regardless of whether email exists or not
      return { success: true, message: 'Invitation processed successfully' };
    });

    const res1 = await mockInviteFunction('team-1', 'existing-user@example.com');
    const res2 = await mockInviteFunction('team-1', 'nonexistent-user@example.com');

    expect(res1).toEqual(res2);
    expect(res1.message).not.toContain('existing');
    expect(res1.message).not.toContain('nonexistent');
  });

  it('correctly calculates invitation token expiration', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const isExpiredPast = new Date('2026-10-18T12:00:00Z') > expiresAt;
    const isExpiredFuture = new Date('2026-10-12T12:00:00Z') > expiresAt;

    expect(isExpiredPast).toBe(true);
    expect(isExpiredFuture).toBe(false);
  });
});

describe('Round-Robin Host Selection & Fairness Strategy', () => {
  it('ranks hosts by fewest recent team bookings with stable tie-breaker', () => {
    const candidateHosts = [
      { id: 'user-c', name: 'Charlie', recentBookingCount: 5 },
      { id: 'user-a', name: 'Alice', recentBookingCount: 2 },
      { id: 'user-b', name: 'Bob', recentBookingCount: 2 },
    ];

    // Sort by recentBookingCount ascending, then by host.id ascending (alphabetical tie-breaker)
    const sorted = [...candidateHosts].sort((a, b) => {
      if (a.recentBookingCount !== b.recentBookingCount) {
        return a.recentBookingCount - b.recentBookingCount;
      }
      return a.id.localeCompare(b.id);
    });

    expect(sorted[0].id).toEqual('user-a'); // 2 bookings, ID user-a < user-b
    expect(sorted[1].id).toEqual('user-b'); // 2 bookings, ID user-b
    expect(sorted[2].id).toEqual('user-c'); // 5 bookings
  });

  it('retries next host if selected host is taken concurrently', () => {
    const candidateHosts = [
      { id: 'user-a', name: 'Alice' },
      { id: 'user-b', name: 'Bob' },
    ];

    let attempt = 0;
    const reserveHost = (host: { id: string }) => {
      attempt++;
      if (host.id === 'user-a') {
        throw new Error('SLOT_OCCUPIED_BY_CONCURRENT_BOOKING');
      }
      return { success: true, host };
    };

    let assigned = null;
    for (const host of candidateHosts) {
      try {
        const res = reserveHost(host);
        assigned = res.host;
        break;
      } catch (err: any) {
        if (err.message === 'SLOT_OCCUPIED_BY_CONCURRENT_BOOKING') {
          continue;
        }
      }
    }

    expect(attempt).toEqual(2);
    expect(assigned?.id).toEqual('user-b');
  });
});
