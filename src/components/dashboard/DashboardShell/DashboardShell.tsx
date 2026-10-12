'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DashboardShell.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
};

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: <OverviewIcon />,
  },
  {
    href: '/dashboard/event-types',
    label: 'Event types',
    icon: <EventTypesIcon />,
  },
  {
    href: '/dashboard/teams',
    label: 'Teams',
    icon: <TeamsIcon />,
  },
  {
    href: '/dashboard/bookings',
    label: 'Bookings',
    icon: <BookingsIcon />,
  },
  {
    href: '/dashboard/availability',
    label: 'Availability',
    icon: <AvailabilityIcon />,
  },
  {
    href: '/dashboard/settings/profile',
    label: 'Settings',
    icon: <SettingsIcon />,
  },
];


// ─── Shell component ──────────────────────────────────────────────────────────

/**
 * DashboardShell — top-level layout for all dashboard routes.
 *
 * Desktop: fixed 236px sidebar + scrollable main area.
 * Mobile: fixed top bar (60px) + slide-in drawer + full-width main.
 *
 * The sidebar is a Server-renderable skeleton; only the mobile toggle
 * requires client state (useState for isOpen).
 */
export default function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close drawer on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const sidebarContent = (
    <>
      {/* Header / wordmark */}
      <div className={styles.sidebarHeader}>
        <Link href="/dashboard" className={styles.wordmark} aria-label="Slotly dashboard home">
          <SlotlyLogo />
          Slotly
        </Link>
      </div>

      {/* Navigation */}
      <nav className={styles.sidebarNav} aria-label="Dashboard navigation">
        <div className={styles.sidebarSection}>
          <p className={styles.sidebarSectionLabel}>Menu</p>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.disabled ? '#' : item.href}
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={item.disabled}
                className={[
                  styles.navItem,
                  isActive ? styles.active : '',
                  item.disabled ? styles.disabled : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                tabIndex={item.disabled ? -1 : undefined}
              >
                <span className={styles.navItemIcon} aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
                {item.disabled && (
                  <span className={styles.comingSoon} aria-label="Coming soon">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className={styles.sidebarFooter}>
        <Link href="/" className={styles.backLink}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M8.5 2.5L4 7l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to site
        </Link>
      </div>
    </>
  );

  return (
    <div className={styles.shell}>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className={styles.sidebar} aria-label="Sidebar">
        {sidebarContent}
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <div className={styles.mobileBar}>
        <Link href="/dashboard" className={styles.wordmark} aria-label="Slotly dashboard home">
          <SlotlyLogo />
          Slotly
        </Link>

        <button
          type="button"
          className={styles.hamburger}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-dashboard-drawer"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className={[styles.bar, mobileOpen ? styles.barOpen1 : ''].join(' ')} />
          <span className={[styles.bar, mobileOpen ? styles.barOpen2 : ''].join(' ')} />
          <span className={[styles.bar, mobileOpen ? styles.barOpen3 : ''].join(' ')} />
        </button>
      </div>

      {/* ── Mobile overlay ──────────────────────────────────────────────── */}
      <div
        className={[styles.mobileOverlay, mobileOpen ? styles.open : ''].join(' ')}
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      <aside
        id="mobile-dashboard-drawer"
        className={[styles.mobileDrawer, mobileOpen ? styles.open : ''].join(' ')}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        {sidebarContent}
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main id="dashboard-main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function SlotlyLogo() {
  return (
    <svg
      width="26"
      height="26"
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

// ─── Nav icons ────────────────────────────────────────────────────────────────

function OverviewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1.5" y="10.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="10.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EventTypesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1.5" y="3" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 1.5v3M12 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1.5 7.5h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="11" r="1" fill="currentColor" />
      <circle cx="9" cy="11" r="1" fill="currentColor" />
      <circle cx="12" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

function TeamsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M12 15v-1.5a3 3 0 0 0-3-3H4.5a3 3 0 0 0-3 3V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6.75" cy="5.25" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.5 15v-1.5a3 3 0 0 0-2.25-2.9M12 3.85a2.25 2.25 0 0 1 0 4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}


function BookingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 1.5a7.5 7.5 0 1 0 0 15A7.5 7.5 0 0 0 9 1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M9 5v4.5l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AvailabilityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 9h12M3 5h12M3 13h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 1.5v1.5M9 15v1.5M1.5 9H3M15 9h1.5M3.697 3.697l1.06 1.06M13.243 13.243l1.06 1.06M14.303 3.697l-1.06 1.06M4.757 13.243l-1.06 1.06"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
