import Link from 'next/link';
import { getAllEventTypes } from '@/lib/eventTypes';
import { getHostBookings } from '@/lib/actions';
import Badge from '@/components/ui/Badge';
import styles from './dashboard.module.css';

const LOCATION_LABELS: Record<string, string> = {
  'google-meet': 'Google Meet',
  phone: 'Phone call',
  'in-person': 'In person',
};

export const metadata = {
  title: 'Dashboard - Slotly',
};

export default async function DashboardPage() {
  const eventTypes = await getAllEventTypes();
  const bookings = await getHostBookings();

  const publishedCount = eventTypes.filter((e) => e.status === 'published').length;
  const recentEvents = eventTypes.slice(0, 3);
  
  const now = new Date();
  const upcomingBookingsCount = bookings.filter(b => b.status === 'confirmed' && b.endTime > now).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.greeting}>Dashboard</p>
        <h1 className={styles.heading}>Welcome back 👋</h1>
        <p className={styles.subheading}>
          Here&apos;s a summary of your Slotly workspace.
        </p>
      </header>

      <section aria-label="Summary statistics" className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconAccent}`} aria-hidden="true">
            <CalendarIcon />
          </div>
          <p className={styles.statValue}>{eventTypes.length}</p>
          <p className={styles.statLabel}>Event types</p>
          <p className={styles.statNote}>{publishedCount} published</p>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`} aria-hidden="true">
            <CheckIcon />
          </div>
          <p className={styles.statValue}>{upcomingBookingsCount}</p>
          <p className={styles.statLabel}>Upcoming bookings</p>
          <p className={styles.statNote}>Total confirmed</p>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconAmber}`} aria-hidden="true">
            <ClockIcon />
          </div>
          <p className={styles.statValue}>On</p>
          <p className={styles.statLabel}>Availability</p>
          <p className={styles.statNote}>Managed in settings</p>
        </div>
      </section>

      <section className={styles.ctaBanner} aria-label="Create a new event type">
        <div className={styles.ctaCopy}>
          <p className={styles.ctaTitle}>Create your first event type</p>
          <p className={styles.ctaBody}>
            Define a meeting format — name, duration, and location — then share
            the link with anyone.
          </p>
        </div>
        <Link href="/dashboard/event-types/new" className={styles.ctaBtn}>
          <PlusIcon />
          New event type
        </Link>
      </section>

      <section aria-labelledby="recent-heading">
        <div className={styles.sectionHeader}>
          <h2 id="recent-heading" className={styles.sectionTitle}>
            Recent event types
          </h2>
          <Link href="/dashboard/event-types" className={styles.viewAll}>
            View all
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M5.5 3.5L9 7l-3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <div className={styles.empty} role="status">
            <div className={styles.emptyIcon} aria-hidden="true">
              <CalendarIcon />
            </div>
            <p className={styles.emptyTitle}>No event types yet</p>
            <p className={styles.emptyBody}>
              Create your first event type to get a shareable booking link.
            </p>
            <Link href="/dashboard/event-types/new" className={styles.emptyBtn}>
              <PlusIcon />
              Create event type
            </Link>
          </div>
        ) : (
          <ul className={styles.eventList} role="list">
            {recentEvents.map((et) => (
              <li key={et.id}>
                <Link
                  href={`/dashboard/event-types/${et.id}`}
                  className={styles.eventCard}
                >
                  <span className={styles.eventColorDot} aria-hidden="true" />
                  <span className={styles.eventInfo}>
                    <span className={styles.eventName}>{et.name}</span>
                    <span className={styles.eventMeta}>
                      {et.durationMinutes} min &middot;{' '}
                      {LOCATION_LABELS[et.location] ?? et.location}
                    </span>
                  </span>
                  <Badge status={et.status} />
                  <span className={styles.eventArrow} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M6 4l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 2v4M13 2v4M2 9h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
