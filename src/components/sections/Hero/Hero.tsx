import Link from 'next/link';
import Button from '@/components/ui/Button';
import CalendarPreview from './CalendarPreview';
import styles from './Hero.module.css';

/**
 * Hero — landing page hero section.
 *
 * Server Component: no client-side state needed here.
 * The CalendarPreview sub-component is also a Server Component;
 * it displays static sample data labelled clearly as a visual demo.
 */
export default function Hero() {
  return (
    <section className={styles.section} aria-labelledby="hero-heading">
      <div className={`container ${styles.inner}`}>
        {/* ── Left: copy ──────────────────────────────────────────────── */}
        <div className={styles.copy}>
          <p className={`section-label ${styles.eyebrow}`} aria-hidden="true">
            Scheduling, simplified
          </p>

          <h1
            id="hero-heading"
            className={`display-text ${styles.headline}`}
          >
            Effortless scheduling for modern teams&nbsp;&amp; pros.
          </h1>

          <p className={styles.subheading}>
            Share your personalized booking link, sync seamlessly with Google Calendar,
            and eliminate the back-and-forth email tag. Book meetings faster and stay focused on what matters.
          </p>

          <div className={styles.actions}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="lg">
                Get started free
              </Button>
            </Link>
            <Button as="a" href="#how-it-works" variant="secondary" size="lg">
              See how it works
            </Button>
          </div>

          <p className={styles.disclaimer}>
            No credit card required &middot; Instant setup &middot; Free forever tier available
          </p>
        </div>

        {/* ── Right: calendar demo ────────────────────────────────────── */}
        <div className={`${styles.preview} animate-float`} aria-hidden="true">
          {/*
           * aria-hidden: this is a purely decorative visual demo.
           * All meaningful content is in the copy above.
           */}
          <CalendarPreview />
        </div>
      </div>
    </section>
  );
}
