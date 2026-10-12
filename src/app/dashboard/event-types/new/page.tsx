'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createEventType } from '@/lib/eventTypes';
import type { EventTypeFormData } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import EventTypeForm from '../EventTypeForm';
import formStyles from '../form.module.css';

/**
 * New event type page — wraps the shared EventTypeForm.
 * On save, creates the record in localStorage and redirects to the list.
 */
export default function NewEventTypePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(data: EventTypeFormData) {
    setIsSaving(true);
    try {
      await createEventType(data);
      toast({
        variant: 'success',
        title: 'Event type created',
        message: data.name,
      });
      router.push('/dashboard/event-types');
    } catch {
      toast({
        variant: 'error',
        title: 'Could not save',
        message: 'Please try again.',
      });
      setIsSaving(false);
    }
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
          New
        </span>
      </nav>

      <header className={formStyles.header}>
        <h1 className={formStyles.heading}>New event type</h1>
        <p className={formStyles.subheading}>
          Define a meeting format. You&apos;ll get a shareable booking link once
          you publish it.
        </p>
      </header>

      <EventTypeForm onSave={handleSave} isSaving={isSaving} />
    </div>
  );
}
