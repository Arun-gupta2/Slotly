import styles from './Footer.module.css';

/**
 * Footer — simple, clean. Branding + navigation + copyright.
 * Server Component.
 */

const FOOTER_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#about', label: 'About' },
  { href: '#', label: 'Privacy' },
  { href: '#', label: 'Terms' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={`container ${styles.inner}`}>
        {/* ── Brand ───────────────────────────────────────────────── */}
        <div className={styles.brand}>
          <a href="/" aria-label="Slotly home" className={styles.wordmark}>
            <SlotlyLogo />
            <span>Slotly</span>
          </a>
          <p className={styles.tagline}>
            Scheduling that gets out of the way.
          </p>
        </div>

        {/* ── Links ───────────────────────────────────────────────── */}
        <nav aria-label="Footer navigation">
          <ul className={styles.links} role="list">
            {FOOTER_LINKS.map(({ href, label }) => (
              <li key={label}>
                <a href={href} className={styles.link}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className={styles.bottom}>
        <div className="container">
          <p className={styles.copyright}>
            &copy; {year} Slotly. Built with care.
          </p>
        </div>
      </div>
    </footer>
  );
}

function SlotlyLogo() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="28" height="28" rx="7" fill="var(--color-accent)" />
      <rect x="7" y="11" width="14" height="1.5" rx="0.75" fill="white" opacity="0.4" />
      <rect x="7" y="15" width="8" height="1.5" rx="0.75" fill="white" opacity="0.4" />
      <rect x="7" y="7.5" width="3" height="3" rx="1.5" fill="white" />
      <rect x="18" y="7.5" width="3" height="3" rx="1.5" fill="white" />
      <circle cx="18" cy="18" r="3" fill="white" opacity="0.9" />
    </svg>
  );
}
