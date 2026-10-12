'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { cancelBooking } from '@/lib/actions';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import styles from './bookings.module.css';

type Booking = {
  id: string;
  guestName: string;
  guestEmail: string;
  startTime: Date;
  endTime: Date;
  guestTimezone: string;
  status: string;
  eventName: string;
  createdAt: Date;
  location?: string | null;
  meetingUrl?: string | null;
  meetingStatus?: string;
};

export default function BookingsList({ initialBookings }: { initialBookings: Booking[] }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [targetBooking, setTargetBooking] = useState<Booking | null>(null);

  const now = new Date();

  // We rely on the server data having already been fetched.
  // Instead of fully reloading from the server on every action for this basic view, 
  // we'll optimistically update or just trigger a refresh (since the page is a server component, 
  // we'd normally use router.refresh(). For simplicity, we just reload window or rely on Next.js 
  // revalidation if we used router). Let's use `window.location.reload()` as a fallback if `router.refresh` 
  // isn't plumbed in, but actually since we're using Next.js App Router, revalidatePath will auto-refresh 
  // the data in the layout on the next navigation or when a server action finishes!
  
  const filteredBookings = initialBookings.filter(b => {
    if (filter === 'cancelled') return b.status === 'cancelled';
    if (b.status === 'cancelled') return false;
    
    const isUpcoming = b.endTime > now;
    return filter === 'upcoming' ? isUpcoming : !isUpcoming;
  });

  async function handleCancelConfirm() {
    if (!targetBooking) return;
    try {
      await cancelBooking(targetBooking.id);
      toast({ variant: 'success', title: 'Booking cancelled' });
      // The server action calls revalidatePath, which automatically refreshes the route data!
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error cancelling', message: err.message });
    } finally {
      setTargetBooking(null);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <button 
          className={`${styles.filterBtn} ${filter === 'upcoming' ? styles.active : ''}`}
          onClick={() => setFilter('upcoming')}
        >Upcoming</button>
        <button 
          className={`${styles.filterBtn} ${filter === 'past' ? styles.active : ''}`}
          onClick={() => setFilter('past')}
        >Past</button>
        <button 
          className={`${styles.filterBtn} ${filter === 'cancelled' ? styles.active : ''}`}
          onClick={() => setFilter('cancelled')}
        >Cancelled</button>
      </div>

      {filteredBookings.length === 0 ? (
        <div className={styles.empty}>
          <p>No {filter} bookings found.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredBookings.map(b => (
            <div key={b.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.eventName}>{b.eventName}</h3>
                  <p className={styles.timeInfo}>
                    {format(b.startTime, 'MMM d, yyyy · h:mm a')} - {format(b.endTime, 'h:mm a')}
                  </p>
                </div>
                <Badge status={b.status === 'confirmed' ? 'published' : 'draft'} />
              </div>
              
              <div className={styles.cardBody}>
                <div className={styles.guestInfo}>
                  <p className={styles.guestName}>{b.guestName}</p>
                  <p className={styles.guestEmail}>{b.guestEmail}</p>
                  {b.meetingUrl ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <a
                        href={b.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#4F46E5',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          textDecoration: 'none'
                        }}
                      >
                        🎥 Join Meeting Link
                      </a>
                    </div>
                  ) : b.meetingStatus === 'pending' ? (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⏳ Generating video link...
                    </p>
                  ) : b.location && b.location !== 'google-meet' && !b.location.startsWith('custom-link:') ? (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6B7280' }}>
                      📍 {b.location === 'phone' ? 'Phone Call' : b.location === 'in-person' ? 'In-Person Meeting' : b.location}
                    </p>
                  ) : null}
                </div>
                
                {b.status === 'confirmed' && filter === 'upcoming' && (
                  <button 
                    className={styles.cancelBtn}
                    onClick={() => setTargetBooking(b)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(targetBooking)}
        title="Cancel Booking?"
        body={`Are you sure you want to cancel the booking with ${targetBooking?.guestName}? They will receive an email notification.`}
        highlight={targetBooking?.guestName ?? ''}
        confirmLabel="Yes, Cancel"
        cancelLabel="Keep Booking"
        onConfirm={handleCancelConfirm}
        onCancel={() => setTargetBooking(null)}
      />
    </div>
  );
}
