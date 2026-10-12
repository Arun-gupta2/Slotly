'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getEventTypeById, updateEventType, deleteEventType } from '@/lib/eventTypes';
import type { EventType, EventTypeFormData } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EventTypeForm from '../EventTypeForm';
import formStyles from '../form.module.css';

type Params = { id: string };

/**
 * Edit event type page.
 *
 * Loads the event type from localStorage on mount. Shows a not-found state
 * if the id doesn't match any record. Handles save, delete, and a header
 * preview of the current status badge.
 */
export default function EditEventTypePage({ params }: { params?: Params }) {
  const routeParams = useParams();
  const id = (params?.id ?? routeParams?.id) as string;
  const router = useRouter();
  const { toast } = useToast();

  const [eventType, setEventType] = useState<EventType | null | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    getEventTypeById(id).then(et => setEventType(et ?? null));
  }, [id]);

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave(data: EventTypeFormData) {
    if (!eventType) return;
    setIsSaving(true);
    try {
      await updateEventType(eventType.id, data);
      toast({ variant: 'success', title: 'Changes saved', message: data.name });
      router.push('/dashboard/event-types');
    } catch {
      toast({ variant: 'error', title: 'Could not save', message: 'Please try again.' });
      setIsSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    if (!eventType) return;
    await deleteEventType(eventType.id);
    toast({ variant: 'success', title: 'Event type deleted' });
    router.push('/dashboard/event-types');
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (eventType === undefined) {
    return (
      <div className={formStyles.page} aria-busy="true">
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>Loading…</p>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────

  if (eventType === null) {
    return (
      <div className={formStyles.page}>
        <div className={formStyles.notFound} role="alert">
          <p className={formStyles.notFoundTitle}>Event type not found</p>
          <p className={formStyles.notFoundBody}>
            This event type may have been deleted, or the link is incorrect.
          </p>
          <Link href="/dashboard/event-types" className={formStyles.notFoundBtn}>
            ← Back to event types
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={formStyles.page}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className={formStyles.breadcrumb}>
        <Link href="/dashboard" className={formStyles.breadcrumbLink}>
          Dashboard
        </Link>
        <span className={formStyles.breadcrumbSep} aria-hidden="true">›</span>
        <Link href="/dashboard/event-types" className={formStyles.breadcrumbLink}>
          Event types
        </Link>
        <span className={formStyles.breadcrumbSep} aria-hidden="true">›</span>
        <span className={formStyles.breadcrumbCurrent} aria-current="page">
          Edit
        </span>
      </nav>

      <header className={formStyles.header}>
        <h1 className={formStyles.heading} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          {eventType.name}
          <Badge status={eventType.status} />
        </h1>
        <p className={formStyles.subheading}>
          Update the details for this event type.{' '}
          {eventType.status === 'published' && (
            <span>
              Booking link:{' '}
              <code style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)' }}>
                slotly.app/{eventType.slug}
              </code>
            </span>
          )}
        </p>
      </header>

      <EventTypeForm
        initialValues={eventType}
        isEditing
        onSave={handleSave}
        onDelete={() => setShowDeleteModal(true)}
        isSaving={isSaving}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete event type?"
        body={`This will permanently delete "${eventType.name}". This action cannot be undone.`}
        highlight={eventType.name}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
