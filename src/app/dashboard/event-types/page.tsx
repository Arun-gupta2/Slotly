'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getAllEventTypes,
  deleteEventType,
  toggleEventTypeStatus,
  getBookingUrl,
  seedIfEmpty,
} from '@/lib/eventTypes';
import type { EventType } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import ConfirmModal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import styles from './eventTypes.module.css';

const LOCATION_LABELS: Record<string, string> = {
  'google-meet': 'Google Meet',
  'custom-link': 'External meeting URL',
  phone: 'Phone call',
  'in-person': 'In person',
};

const LOCATION_ICONS: Record<string, string> = {
  'google-meet': '📹',
  'custom-link': '🔗',
  phone: '📞',
  'in-person': '📍',
};

function getLocationDisplay(loc: string) {
  if (loc.startsWith('custom-link:')) {
    return { icon: '🔗', label: 'External meeting URL' };
  }
  return {
    icon: LOCATION_ICONS[loc] || '📍',
    label: LOCATION_LABELS[loc] || loc,
  };
}

/**
 * Event Types list page — Client Component.
 *
 * Handles: list, delete (with confirmation), toggle status, copy link.
 * All mutations go through the localStorage repository.
 */
export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [mounted, setMounted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventType | null>(null);
  const { toast } = useToast();

  const reload = useCallback(async () => {
    const data = await getAllEventTypes();
    setEventTypes(data);
  }, []);

  useEffect(() => {
    seedIfEmpty();
    reload();
    setMounted(true);
  }, [reload]);

  // ── Delete ───────────────────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteEventType(deleteTarget.id);
    await reload();
    setDeleteTarget(null);
    toast({ variant: 'success', title: 'Event type deleted' });
  }

  // ── Toggle ───────────────────────────────────────────────────────────────

  async function handleToggle(et: EventType) {
    await toggleEventTypeStatus(et.id);
    await reload();
    const newStatus = et.status === 'published' ? 'draft' : 'published';
    toast({
      variant: 'success',
      title: newStatus === 'published' ? 'Event type published' : 'Switched to draft',
      message: et.name,
    });
  }

  // ── Copy link ────────────────────────────────────────────────────────────

  async function handleCopyLink(et: EventType) {
    const url = await getBookingUrl(et.slug);
    try {
      await navigator.clipboard.writeText(url);
      toast({ variant: 'success', title: 'Link copied!', message: url });
    } catch {
      toast({ variant: 'error', title: 'Could not copy', message: 'Please copy manually: ' + url });
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <p className={styles.eyebrow}>Management</p>
          <h1 className={styles.heading}>Event types</h1>
          <p className={styles.subheading}>
            {mounted
              ? `${eventTypes.length} event type${eventTypes.length !== 1 ? 's' : ''} — share a link so guests can book you`
              : 'Manage your meeting event types'}
          </p>
        </div>
        <Link href="/dashboard/event-types/new" className={styles.newBtn} id="new-event-type-btn">
          <PlusIcon />
          New event type
        </Link>
      </header>

      {/* ── List ─────────────────────────────────────────────────────── */}
      {!mounted ? (
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>Loading…</p>
      ) : eventTypes.length === 0 ? (
        <div className={styles.empty} role="status">
          <div className={styles.emptyIcon} aria-hidden="true">
            <EmptyIcon />
          </div>
          <p className={styles.emptyTitle}>No event types yet</p>
          <p className={styles.emptyBody}>
            Create your first event type to get a personal booking link you can
            share with anyone.
          </p>
          <Link href="/dashboard/event-types/new" className={styles.emptyBtn}>
            <PlusIcon />
            Create your first event type
          </Link>
        </div>
      ) : (
        <ul className={styles.list} role="list" aria-label="Event types">
          {eventTypes.map((et) => (
            <li key={et.id} className={styles.card}>
              {/* Color accent bar */}
              <span className={styles.cardColorBar} aria-hidden="true" />

              {/* Info */}
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{et.name}</p>
                <div className={styles.cardMeta}>
                  <span className={styles.metaItem}>
                    <ClockIcon />
                    {et.durationMinutes} min
                  </span>
                  <span className={styles.metaItem}>
                    <span aria-hidden="true">{getLocationDisplay(et.location).icon}</span>
                    {getLocationDisplay(et.location).label}
                  </span>
                  <Badge status={et.status} />
                </div>
              </div>

              {/* Actions */}
              <div className={styles.cardActions} role="group" aria-label={`Actions for ${et.name}`}>
                {/* Edit */}
                <Link
                  href={`/dashboard/event-types/${et.id}`}
                  className={`${styles.actionBtn} ${styles.editBtn}`}
                  id={`edit-${et.id}`}
                >
                  <EditIcon />
                  Edit
                </Link>

                {/* Toggle published */}
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.publishBtn} ${et.status === 'published' ? styles.isPublished : ''}`}
                  onClick={() => handleToggle(et)}
                  id={`toggle-${et.id}`}
                  aria-pressed={et.status === 'published'}
                  aria-label={
                    et.status === 'published'
                      ? `Unpublish ${et.name}`
                      : `Publish ${et.name}`
                  }
                >
                  {et.status === 'published' ? (
                    <>
                      <EyeOffIcon /> Unpublish
                    </>
                  ) : (
                    <>
                      <EyeIcon /> Publish
                    </>
                  )}
                </button>

                {/* Copy link */}
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.copyBtn}`}
                  onClick={() => handleCopyLink(et)}
                  disabled={et.status !== 'published'}
                  id={`copy-${et.id}`}
                  aria-label={
                    et.status === 'published'
                      ? `Copy booking link for ${et.name}`
                      : `${et.name} must be published to copy its link`
                  }
                  title={et.status !== 'published' ? 'Publish this event type to copy its link' : undefined}
                >
                  <LinkIcon />
                  Copy link
                </button>

                {/* Delete */}
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={() => setDeleteTarget(et)}
                  id={`delete-${et.id}`}
                  aria-label={`Delete ${et.name}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Delete confirmation modal ─────────────────────────────────── */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete event type?"
        body={`This will permanently delete "${deleteTarget?.name ?? ''}". This action cannot be undone.`}
        highlight={deleteTarget?.name ?? ''}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M8.5 1.5a1.414 1.414 0 0 1 2 2L3 11H1V9L8.5 1.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M1.5 1.5l9 9M5 3.13A4.6 4.6 0 0 1 6 3c3 0 5 3 5 3a8.7 8.7 0 0 1-1.5 1.87M3.9 3.9A8.73 8.73 0 0 0 1 6s2 3 5 3a4.6 4.6 0 0 0 2.1-.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M7 5a3 3 0 0 1 0 4.24l-1.41 1.42a3 3 0 0 1-4.25-4.25l.71-.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M5 7a3 3 0 0 1 0-4.24L6.41 1.34a3 3 0 0 1 4.25 4.25l-.71.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 3.5h9M5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M10.5 3.5l-.7 7.1a1 1 0 0 1-1 .9H4.2a1 1 0 0 1-1-.9L2.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="22" height="20" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M20 3v4M8 3v4M3 12h22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M9 18h10M9 22h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
