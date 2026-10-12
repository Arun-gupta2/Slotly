import styles from './HowItWorks.module.css';

/**
 * HowItWorks — numbered steps explaining the Slotly flow.
 *
 * Server Component. Two perspectives: host (you) and guest.
 * Laid out as a vertical numbered list with a connector line.
 */

type Step = {
  number: string;
  eyebrow: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    number: '01',
    eyebrow: 'Set up once',
    title: 'Connect your calendar and set your hours',
    body: "Tell Slotly when you're generally available. Your personal booking page is created instantly — no design skills needed.",
  },
  {
    number: '02',
    eyebrow: 'Share your link',
    title: 'Send your link to anyone, anywhere',
    body: 'Copy your unique Slotly link and paste it wherever you need — an email, a message, your website, or your email signature.',
  },
  {
    number: '03',
    eyebrow: 'Guest picks a time',
    title: 'Your guest chooses a slot that works for them',
    body: "They see only times you're free. No account required. They fill in their name and any details you ask for, then confirm.",
  },
  {
    number: '04',
    eyebrow: 'Both confirmed',
    title: 'You both receive a calendar invite',
    body: 'Slotly sends confirmations to both parties, adds the event to your calendar, and handles rescheduling if plans change.',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className={`${styles.section} section`}
      aria-labelledby="hiw-heading"
    >
      <div className={`container ${styles.inner}`}>
        {/* ── Left: heading ────────────────────────────────────────── */}
        <div className={styles.sideHeader}>
          <p className="section-label">How it works</p>
          <h2
            id="hiw-heading"
            className={`display-text ${styles.heading}`}
          >
            From link to meeting in under a&nbsp;minute.
          </h2>
          <p className={styles.subheading}>
            Slotly removes every unnecessary step between &ldquo;let&apos;s meet&rdquo;
            and actually meeting.
          </p>
        </div>

        {/* ── Right: steps ─────────────────────────────────────────── */}
        <ol className={styles.steps} aria-label="How Slotly works">
          {STEPS.map((step, i) => (
            <li key={step.number} className={styles.step}>
              {/* Connector line between steps */}
              {i < STEPS.length - 1 && (
                <div className={styles.connector} aria-hidden="true" />
              )}

              <div className={styles.stepNumber} aria-hidden="true">
                {step.number}
              </div>

              <div className={styles.stepContent}>
                <p className={styles.stepEyebrow}>{step.eyebrow}</p>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
