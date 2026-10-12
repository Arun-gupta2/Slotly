'use server';

import { db, ensureTablesExist } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function registerUser(data: { name: string; email: string; password: string }) {
  await ensureTablesExist();

  // Validate input
  if (!data.name || !data.email || !data.password) {
    throw new Error('Missing required fields');
  }

  if (data.password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Check if email is taken
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });

  if (existing) {
    throw new Error('Email is already in use');
  }

  // Generate a username slug from their name
  let baseUsername = data.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!baseUsername) baseUsername = 'user';
  
  let username = baseUsername;
  let counter = 1;
  while (true) {
    const existingSlug = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!existingSlug) break;
    username = `${baseUsername}${counter++}`;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Insert user
  const [newUser] = await db.insert(users).values({
    name: data.name,
    email: data.email,
    passwordHash,
    username,
  }).returning();

  // Seed default Mon-Fri availability rules (09:00 - 17:00)
  const { availabilityRules } = await import('./db/schema');
  await db.insert(availabilityRules).values(
    [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      userId: newUser.id,
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
    }))
  );

  return { success: true };
}
