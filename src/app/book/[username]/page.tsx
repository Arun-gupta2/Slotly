import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { users, eventTypes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import styles from './profile.module.css';

type Params = {
  username: string;
};

export async function generateMetadata({ params }: { params: Params }) {
  const host = await db.query.users.findFirst({
    where: eq(users.username, params.username),
  });
  if (!host) return { title: 'Not Found' };
  return { title: `${host.name} - Slotly Booking` };
}

export default async function HostProfilePage({ params }: { params: Params }) {
  const { username } = params;

  // 1. Fetch Host
  const host = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!host) {
    notFound();
  }

  // 2. Fetch Published Event Types
  const publishedEvents = await db.query.eventTypes.findMany({
    where: and(
      eq(eventTypes.userId, host.id),
      eq(eventTypes.status, 'published')
    ),
    orderBy: (eventTypes, { asc }) => [asc(eventTypes.createdAt)],
  });

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <main className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.avatarPlaceholder} aria-hidden="true">
          {getInitials(host.name)}
        </div>
        <h1 className={styles.name}>{host.name}</h1>
        {host.bio && <p className={styles.bio}>{host.bio}</p>}
      </div>

      <div className={styles.eventsList}>
        {publishedEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No available events found for this user.</p>
          </div>
        ) : (
          publishedEvents.map((event) => (
            <Link
              key={event.id}
              href={`/book/${host.username}/${event.slug}`}
              className={styles.eventItem}
            >
              <div className={styles.eventInfo}>
                <h2 className={styles.eventName}>{event.name}</h2>
                <div className={styles.eventMeta}>
                  <div className={styles.eventMetaItem}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    {event.durationMinutes} min
                  </div>
                  {event.location && (
                    <div className={styles.eventMetaItem}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9 7 13 7 13C7 13 11.5 9 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z" stroke="currentColor" strokeWidth="1.2" />
                        <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                      {event.location === 'google-meet' ? 'Google Meet' : 'In-person / Call'}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.arrow} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
