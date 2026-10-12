'use client';

/**
 * Nav — top navigation bar.
 *
 * This is a Client Component because the mobile menu toggle requires
 * useState. The rest of the landing page stays as Server Components.
 *
 * Accessibility: the mobile menu button has aria-expanded and aria-controls,
 * and the nav menu has a matching id. Focus returns to the toggle on close
 * because the toggle button is always in the DOM.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import styles from './Nav.module.css';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#about', label: 'About' },
];

export default function Nav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Add a subtle border + background when the user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when Escape is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  return (
    <header
      className={[styles.header, isScrolled ? styles.scrolled : ''].join(' ')}
      role="banner"
    >
      <nav
        className={`${styles.nav} container`}
        aria-label="Main navigation"
      >
        {/* ── Wordmark ──────────────────────────────────────────────────── */}
        <Link href="/" className={styles.wordmark} aria-label="Slotly home">
          <SlotlyLogo />
          <span>Slotly</span>
        </Link>

        {/* ── Desktop links ─────────────────────────────────────────────── */}
        <ul className={styles.desktopLinks} role="list">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a href={href} className={styles.navLink}>
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* ── Desktop CTA ───────────────────────────────────────────────── */}
        <div className={styles.desktopCta}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm">
              Sign up
            </Button>
          </Link>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="sm">
              Get started
            </Button>
          </Link>
        </div>

        {/* ── Mobile hamburger ──────────────────────────────────────────── */}
        <button
          id="mobile-menu-toggle"
          className={styles.hamburger}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={toggleMenu}
        >
          <span className={[styles.bar, isMenuOpen ? styles.barOpen1 : ''].join(' ')} />
          <span className={[styles.bar, isMenuOpen ? styles.barOpen2 : ''].join(' ')} />
          <span className={[styles.bar, isMenuOpen ? styles.barOpen3 : ''].join(' ')} />
        </button>
      </nav>

      {/* ── Mobile menu panel ───────────────────────────────────────────── */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-label="Mobile navigation"
        aria-hidden={!isMenuOpen}
        className={[styles.mobileMenu, isMenuOpen ? styles.mobileMenuOpen : ''].join(' ')}
      >
        <ul role="list" className={styles.mobileLinks}>
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                className={styles.mobileLink}
                onClick={() => setIsMenuOpen(false)}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.mobileCta}>
          <Link href="/login" style={{ width: '100%', textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <Button
              variant="secondary"
              size="md"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Log in
            </Button>
          </Link>
          <Link href="/register" style={{ width: '100%', textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <Button
              variant="secondary"
              size="md"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Sign up
            </Button>
          </Link>
          <Link href="/login" style={{ width: '100%', textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
            <Button
              variant="primary"
              size="md"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ── Slotly Logo SVG ──────────────────────────────────────────────────────── */
function SlotlyLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Rounded square */}
      <rect width="28" height="28" rx="7" fill="var(--color-accent)" />
      {/* Simplified calendar grid mark */}
      <rect x="7" y="11" width="14" height="1.5" rx="0.75" fill="white" opacity="0.4" />
      <rect x="7" y="15" width="8" height="1.5" rx="0.75" fill="white" opacity="0.4" />
      <rect x="7" y="7.5" width="3" height="3" rx="1.5" fill="white" />
      <rect x="18" y="7.5" width="3" height="3" rx="1.5" fill="white" />
      {/* Dot accent */}
      <circle cx="18" cy="18" r="3" fill="white" opacity="0.9" />
    </svg>
  );
}
