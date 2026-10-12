'use server';

import { db } from './db';
import { eventTypes } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUser } from './actions';
import type { EventType, EventTypeFormData } from './types';
import { revalidatePath } from 'next/cache';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export async function getBookingUrl(slug: string): Promise<string> {
  const user = await getSessionUser();
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/book/${user.username}/${slug}`;
}

export async function getAllEventTypes(): Promise<EventType[]> {
  const user = await getSessionUser();
  const records = await db.query.eventTypes.findMany({
    where: eq(eventTypes.userId, user.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  // Map to the expected type
  return records.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    durationMinutes: r.durationMinutes as any,
    location: r.location as any,
    status: r.status as any,
    slug: r.slug,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getEventTypeById(id: string): Promise<EventType | undefined> {
  const user = await getSessionUser();
  const r = await db.query.eventTypes.findFirst({
    where: and(eq(eventTypes.id, id), eq(eventTypes.userId, user.id)),
  });

  if (!r) return undefined;

  return {
    id: r.id,
    name: r.name,
    description: r.description,
    durationMinutes: r.durationMinutes as any,
    location: r.location as any,
    status: r.status as any,
    slug: r.slug,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function createEventType(data: EventTypeFormData): Promise<EventType> {
  const user = await getSessionUser();
  
  let baseSlug = toSlug(data.name);
  if (!baseSlug) baseSlug = 'event';

  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await db.query.eventTypes.findFirst({
      where: and(eq(eventTypes.userId, user.id), eq(eventTypes.slug, slug)),
    });
    if (!existing) break;
    slug = `${baseSlug}-${counter++}`;
  }

  const [inserted] = await db.insert(eventTypes).values({
    userId: user.id,
    name: data.name,
    description: data.description,
    durationMinutes: data.durationMinutes,
    location: data.location,
    status: data.status,
    slug,
  }).returning();

  revalidatePath('/dashboard/event-types');

  return {
    id: inserted.id,
    name: inserted.name,
    description: inserted.description,
    durationMinutes: inserted.durationMinutes as any,
    location: inserted.location as any,
    status: inserted.status as any,
    slug: inserted.slug,
    createdAt: inserted.createdAt.toISOString(),
    updatedAt: inserted.updatedAt.toISOString(),
  };
}

export async function updateEventType(id: string, data: Partial<EventTypeFormData>): Promise<EventType | undefined> {
  const user = await getSessionUser();
  
  const existing = await getEventTypeById(id);
  if (!existing) return undefined;

  const updateData: any = { ...data };
  
  if (data.name && data.name !== existing.name) {
    let baseSlug = toSlug(data.name);
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const collision = await db.query.eventTypes.findFirst({
        where: and(eq(eventTypes.userId, user.id), eq(eventTypes.slug, slug)),
      });
      if (!collision || collision.id === id) break;
      slug = `${baseSlug}-${counter++}`;
    }
    updateData.slug = slug;
  }

  const [updated] = await db.update(eventTypes)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(and(eq(eventTypes.id, id), eq(eventTypes.userId, user.id)))
    .returning();

  revalidatePath('/dashboard/event-types');

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    durationMinutes: updated.durationMinutes as any,
    location: updated.location as any,
    status: updated.status as any,
    slug: updated.slug,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteEventType(id: string): Promise<void> {
  const user = await getSessionUser();
  await db.delete(eventTypes).where(and(eq(eventTypes.id, id), eq(eventTypes.userId, user.id)));
  revalidatePath('/dashboard/event-types');
}

export async function toggleEventTypeStatus(id: string): Promise<EventType | undefined> {
  const record = await getEventTypeById(id);
  if (!record) return undefined;
  return updateEventType(id, {
    status: record.status === 'published' ? 'draft' : 'published',
  });
}

export async function seedIfEmpty(): Promise<void> {
  // No-op for DB implementation. Seeds should be handled by standard DB seeders if needed.
}
