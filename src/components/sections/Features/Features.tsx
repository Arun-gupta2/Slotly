import type React from 'react';
import styles from './Features.module.css';

/**
 * Features — three core product capabilities.
 *
 * Server Component. No interactivity needed.
 *
 * Each feature card uses a simple SVG icon, a short title,
 * and a one-sentence description. The layout adapts from a single
 * column on mobile to three columns on desktop.
 */

type Feature = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    id: 'availability',
    icon: <AvailabilityIcon />,
    title: 'Smart availability rules',
    description:
      'Define recurring business hours, meeting buffers, and daily maximums. Slotly automatically calculates and only shows slots where you are genuinely free.',
  },
  {
    id: 'links',
    icon: <LinkIcon />,
    title: 'Personal & team booking links',
    description:
      'Share clean, custom links (slotly/book/your-name) that look sharp in email signatures, DMs, or pitches. Guests book in seconds without installing anything.',
  },
  {
    id: 'calendar-sync',
    icon: <SyncIcon />,
    title: 'Real-time calendar sync',
    description:
      'Seamless two-way Google Calendar integration eliminates double-bookings. As soon as you add a personal event, conflicting slots vanish automatically.',
  },
  {
    id: 'confirmations',
    icon: <ConfirmIcon />,
    title: 'Instant confirmations & notifications',
    description:
      'Both you and your guests receive instant confirmation emails with calendar invitations and video links. Keep no-show rates close to zero.',
  },
  {
    id: 'rescheduling',
    icon: <RescheduleIcon />,
    title: 'Self-serve rescheduling',
    description:
      'Plans change? Guests can reschedule or cancel directly from their confirmation email with a single click — no messy back-and-forth email chains.',
  },
  {
    id: 'teams',
    icon: <TeamIcon />,
    title: 'Team & collective events',
    description:
      'Coordinate team discovery calls, round-robin assignments, and joint consultations across multiple team members and varying timezones with ease.',
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className={`${styles.section} section`}
      aria-labelledby="features-heading"
    >
      <div className="container">
        {/* ── Section header ──────────────────────────────────────── */}
        <header className={styles.header}>
          <p className="section-label">Powerful Capabilities</p>
          <h2
            id="features-heading"
            className={`display-text ${styles.heading}`}
          >
            Built for how modern teams schedule.
          </h2>
          <p className={styles.subheading}>
            All the intelligence you need to automate your calendar, protect your focus time,
            and deliver a frictionless booking experience for every guest.
          </p>
        </header>

        {/* ── Cards ───────────────────────────────────────────────── */}
        <ul className={styles.grid} role="list">
          {FEATURES.map((feature) => (
            <li key={feature.id} className={styles.card}>
              <div className={styles.iconWrap} aria-hidden="true">
                {feature.icon}
              </div>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardDesc}>{feature.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SyncIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 21v-5h-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function RescheduleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

function AvailabilityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 3v4M8 3v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="8" cy="15" r="1.25" fill="currentColor" />
      <circle cx="12" cy="15" r="1.25" fill="currentColor" />
      <circle cx="16" cy="15" r="1.25" fill="currentColor" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13.5 10.5a4.5 4.5 0 0 1 0 6.364l-2.121 2.121a4.5 4.5 0 0 1-6.364-6.364l1.06-1.06"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
      />
      <path
        d="M10.5 13.5a4.5 4.5 0 0 1 0-6.364l2.121-2.121a4.5 4.5 0 0 1 6.364 6.364l-1.06 1.06"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
      />
    </svg>
  );
}

function ConfirmIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="m8.5 12 2.5 2.5 4.5-5"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
