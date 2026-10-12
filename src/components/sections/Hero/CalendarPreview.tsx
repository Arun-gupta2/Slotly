import styles from './CalendarPreview.module.css';

/**
 * CalendarPreview — a decorative weekly calendar mock-up.
 *
 * This component uses STATIC SAMPLE DATA for illustration only.
 * It does not represent a real booking or actual availability.
 * All time slots are hard-coded and labelled clearly.
 *
 * Design: mimics a modern weekly calendar with:
 *  - Day columns (Mon–Fri)
 *  - Time slots with colour-coded event blocks
 *  - A "booking confirmed" badge to illustrate the flow
 */

type CalendarEvent = {
  id: string;
  day: number; // 0 = Mon
  startSlot: number; // 0-based slot index (each slot = 30 min)
  span: number; // number of 30-min slots
  label: string;
  type: 'booked' | 'available' | 'accent';
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIMES = ['9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00'];

/** Sample events — clearly illustrative data, not real bookings */
const EVENTS: CalendarEvent[] = [
  { id: 'e1', day: 0, startSlot: 0, span: 2, label: 'Team sync',   type: 'booked' },
  { id: 'e2', day: 1, startSlot: 2, span: 2, label: 'Design review', type: 'accent' },
  { id: 'e3', day: 2, startSlot: 0, span: 1, label: 'Open',          type: 'available' },
  { id: 'e4', day: 2, startSlot: 2, span: 2, label: '1:1 with Alex', type: 'booked' },
  { id: 'e5', day: 3, startSlot: 1, span: 1, label: 'Open',          type: 'available' },
  { id: 'e6', day: 3, startSlot: 4, span: 2, label: 'Open',          type: 'available' },
  { id: 'e7', day: 4, startSlot: 0, span: 3, label: 'Workshop',      type: 'booked' },
];

export default function CalendarPreview() {
  const NUM_SLOTS = TIMES.length;

  return (
    <div className={styles.card}>
      {/* ── Header row ─────────────────────────────────────────────── */}
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <span className={styles.calIcon} aria-hidden="true">📅</span>
          <span>Week of Oct 13</span>
        </div>
        <span className={styles.confirmedBadge}>
          <span className={styles.dot} aria-hidden="true" />
          3 slots open
        </span>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────── */}
      <div className={styles.grid}>
        {/* Time labels column */}
        <div className={styles.timeCol}>
          {TIMES.map((t) => (
            <div key={t} className={styles.timeLabel}>
              {t}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map((day, dayIdx) => {
          const dayEvents = EVENTS.filter((e) => e.day === dayIdx);

          return (
            <div key={day} className={styles.dayCol}>
              <div className={styles.dayHeader}>{day}</div>
              <div className={styles.dayBody} style={{ '--slots': NUM_SLOTS } as React.CSSProperties}>
                {/* Empty slot grid lines */}
                {TIMES.map((_, slotIdx) => (
                  <div
                    key={slotIdx}
                    className={styles.slot}
                    style={{ '--slot': slotIdx } as React.CSSProperties}
                  />
                ))}

                {/* Event blocks */}
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={[styles.event, styles[ev.type]].join(' ')}
                    style={{
                      '--start': ev.startSlot,
                      '--span': ev.span,
                    } as React.CSSProperties}
                  >
                    <span className={styles.eventLabel}>{ev.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer note ────────────────────────────────────────────── */}
      <p className={styles.demoNote}>
        ✦ Sample data for illustration only
      </p>
    </div>
  );
}
