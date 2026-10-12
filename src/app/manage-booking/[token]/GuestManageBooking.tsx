'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { guestCancelBooking } from '@/lib/actions';
import ConfirmModal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';

type Props = {
  booking: {
    id: string;
    token: string;
    guestName: string;
    guestEmail: string;
    startTime: Date;
    endTime: Date;
    status: string;
    guestTimezone: string;
    eventName: string;
    hostName: string;
    meetingUrl?: string | null;
    meetingStatus?: string;
  };
};

export default function GuestManageBooking({ booking }: Props) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(booking.status);

  async function handleCancel() {
    setIsCancelling(true);
    setError('');
    try {
      await guestCancelBooking(booking.token);
      setStatus('cancelled');
      setShowConfirm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', border: '1.5px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Manage your booking</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-6)' }}>You can view details or cancel your meeting with {booking.hostName}.</p>

      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{booking.eventName}</h2>
          <Badge status={status === 'confirmed' ? 'published' : 'draft'} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <p style={{ color: 'var(--color-text)', fontWeight: 500 }}>
            {format(booking.startTime, 'EEEE, MMMM d, yyyy')}
          </p>
          <p style={{ color: 'var(--color-muted)' }}>
            {format(booking.startTime, 'h:mm a')} - {format(booking.endTime, 'h:mm a')} ({booking.guestTimezone})
          </p>
        </div>

        {booking.meetingUrl ? (
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-muted)', marginBottom: 'var(--space-2)' }}>Video Meeting</p>
            <a
              href={booking.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-fg, #ffffff)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 'var(--text-sm)'
              }}
            >
              <span>🎥 Join Meeting</span>
            </a>
          </div>
        ) : booking.meetingStatus === 'pending' ? (
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span>
              Video conference link is being generated. It will also be sent to your email.
            </p>
          </div>
        ) : null}
      </div>

      {status === 'confirmed' && (
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <button 
            onClick={() => setShowConfirm(true)}
            style={{ padding: 'var(--space-3) var(--space-6)', backgroundColor: 'transparent', border: '1.5px solid #DC2626', color: '#DC2626', borderRadius: 'var(--radius-full)', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel Booking
          </button>
          {/* Note: Rescheduling involves selecting a new time and replacing the booking. For brevity, we handle Cancellation here. */}
        </div>
      )}

      {error && <p style={{ color: '#DC2626', marginTop: 'var(--space-4)' }}>{error}</p>}

      <ConfirmModal
        isOpen={showConfirm}
        title="Cancel Booking?"
        body="Are you sure you want to cancel this meeting? This action cannot be undone."
        highlight={booking.eventName}
        confirmLabel="Yes, cancel it"
        cancelLabel="No, keep it"
        onConfirm={handleCancel}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
