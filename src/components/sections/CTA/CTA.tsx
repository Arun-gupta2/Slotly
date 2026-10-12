import Link from 'next/link';
import Button from '@/components/ui/Button';
import styles from './CTA.module.css';

/**
 * CTA — bottom call-to-action section before the footer.
 *
 * Server Component. No interactivity.
 * Uses a warm accent background panel to visually separate this
 * section and draw attention to the primary action.
 */
export default function CTA() {
  return (
    <section
      id="get-started"
      className={`${styles.section} section`}
      aria-labelledby="cta-heading"
    >
      <div className="container">
        <div className={styles.panel}>
          <div className={styles.content}>
            <p className={styles.eyebrow}>Ready when you are</p>
            <h2
              id="cta-heading"
              className={`display-text ${styles.heading}`}
            >
              Take control of your calendar today.
            </h2>
            <p className={styles.body}>
              Join thousands of freelancers, founders, and growing teams who save hours
              every week with Slotly. Get started in seconds — completely free.
            </p>
            <div className={styles.actions} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <Button
                  variant="primary"
                  size="lg"
                  aria-label="Get started with Slotly"
                >
                  Get started free
                </Button>
              </Link>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <Button
                  variant="secondary"
                  size="lg"
                  aria-label="Create your free account"
                >
                  Sign up with email
                </Button>
              </Link>
              <span className={styles.hint}>
                No credit card required &middot; Free forever for individuals
              </span>
            </div>
          </div>

          {/* Decorative background shapes */}
          <div className={styles.shape1} aria-hidden="true" />
          <div className={styles.shape2} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
