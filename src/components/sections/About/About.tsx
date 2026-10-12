import styles from './About.module.css';

/**
 * About — a short brand statement section.
 *
 * Server Component. Gives the #about anchor a home.
 * Kept intentionally concise — no long team bios yet.
 */
export default function About() {
  return (
    <section
      id="about"
      className={`${styles.section} section`}
      aria-labelledby="about-heading"
    >
      <div className={`container ${styles.inner}`}>
        <div className={styles.content}>
          <p className="section-label">About Slotly</p>
          <h2
            id="about-heading"
            className={`display-text ${styles.heading}`}
          >
            Built for the way people actually&nbsp;schedule.
          </h2>
          <div className={styles.body}>
            <p>
              Most scheduling tools are built around enterprise features — complicated
              workflows, team management, and billing dashboards. Slotly takes a
              different approach: we start with the individual.
            </p>
            <p>
              Whether you&apos;re a freelancer booking client calls, a teacher setting
              office hours, or just someone who wants to stop playing email tag,
              Slotly gives you a clean, fast way to share your time.
            </p>
            <p>
              No bloated settings pages. No calendar confusion. Just a link, a slot,
              and a meeting.
            </p>
          </div>
        </div>

        {/* Decorative stat strip */}
        <ul className={styles.stats} role="list" aria-label="Key facts about Slotly">
          {[
            { value: '< 60s', label: 'to set up your first booking page' },
            { value: '0', label: 'emails needed to confirm a meeting' },
            { value: '100%', label: 'free for personal use' },
          ].map(({ value, label }) => (
            <li key={value} className={styles.stat}>
              <span className={styles.statValue}>{value}</span>
              <span className={styles.statLabel}>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
