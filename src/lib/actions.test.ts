import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateAccountSettings } from './actions';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import * as auth from 'next-auth';

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Account Settings Actions', () => {
  beforeEach(async () => {
    // We would clear DB or run inside a transaction in a real setup
    vi.clearAllMocks();
  });

  it('throws an error if unauthenticated', async () => {
    vi.spyOn(auth, 'getServerSession').mockResolvedValue(null);

    await expect(
      updateAccountSettings({ name: 'Test', username: 'test', bio: 'test bio', timezone: 'UTC' })
    ).rejects.toThrow('Not authenticated');
  });

  it('allows updating account settings when authenticated', async () => {
    // Mock user session
    vi.spyOn(auth, 'getServerSession').mockResolvedValue({ user: { id: 'user-1' } } as any);
    
    // We would need to mock db.query.users.findFirst and db.update here if we want to fully test
    // But assuming the test environment has a real DB or we mock it:
    vi.spyOn(db.query.users, 'findFirst').mockResolvedValue({ id: 'user-1', username: 'old-username' } as any);
    const updateSpy = vi.spyOn(db, 'update').mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(true),
    } as any);

    await updateAccountSettings({ name: 'New Name', username: 'old-username', bio: 'My bio', timezone: 'UTC' });
    expect(updateSpy).toHaveBeenCalled();
  });

  it('prevents updating to an already taken username', async () => {
    vi.spyOn(auth, 'getServerSession').mockResolvedValue({ user: { id: 'user-1' } } as any);
    
    // Mock current user
    vi.spyOn(db.query.users, 'findFirst')
      // First call for getSessionUser
      .mockResolvedValueOnce({ id: 'user-1', username: 'old-username' } as any)
      // Second call for collision check
      .mockResolvedValueOnce({ id: 'user-2', username: 'taken-username' } as any);

    await expect(
      updateAccountSettings({ name: 'New Name', username: 'taken-username', bio: 'My bio', timezone: 'UTC' })
    ).rejects.toThrow('Username is already taken');
  });
});
