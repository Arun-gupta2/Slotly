'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { formatInTimeZone } from '@/lib/timezoneFormat';
import { createTeamBookingAction } from './actions';
import FormField from '@/components/ui/FormField';

type Props = {
  team: { id: string; name: string; slug: string };
  eventType: { id: string; name: string; description: string; durationMinutes: number; location: string };
  availableSlots: string[]; // ISO string array
  eligibleHostsCount: number;
};

export default function TeamBookingFlow({ team, eventType, availableSlots, eligibleHostsCount }: Props) {
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [assignedHostName, setAssignedHostName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const guestTimezone = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

  const selectedSlot = selectedSlotIso ? new Date(selectedSlotIso) : null;
  const parsedSlots = availableSlots.map((s) => new Date(s));
  const [bookingResult, setBookingResult] = useState<{
    bookingId?: string;
    managementToken?: string;
    meetingUrl?: string | null;
    meetingStatus?: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlotIso) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await createTeamBookingAction({
        eventTypeId: eventType.id,
        guestName: name,
        guestEmail: email,
        startTimeIso: selectedSlotIso,
        guestTimezone,
      });

      setAssignedHostName(res.assignedHost.name);
      setBookingResult(res);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Selected time slot is no longer available. Please select another time.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div style={{ maxWidth: '560px', margin: '60px auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '40px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '48px', color: '#059669', marginBottom: '16px' }}>✓</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          Team Booking Confirmed!
        </h1>
        <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.6', marginBottom: '20px' }}>
          You are scheduled for <strong>{eventType.name}</strong> with <strong>{assignedHostName}</strong> ({team.name}).
        </p>

        {/* Meeting link / location details */}
        <div style={{ margin: '20px auto', maxWidth: '440px', textAlign: 'left' }}>
          {bookingResult?.meetingStatus === 'ready' && bookingResult.meetingUrl && (
            <div style={{ padding: '16px', backgroundColor: '#EEF2FF', border: '1.5px solid #C7D2FE', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: '#312E81' }}>
                📹 Video Meeting Link:
              </p>
              <a
                href={bookingResult.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '14px', fontWeight: 600, color: '#4359E8', wordBreak: 'break-all', textDecoration: 'underline' }}
              >
                Join Meeting ↗
              </a>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280', wordBreak: 'break-all' }}>
                {bookingResult.meetingUrl}
              </p>
            </div>
          )}

          {bookingResult?.meetingStatus === 'pending' && (
            <div style={{ padding: '14px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '12px' }}>
              <p style={{ margin: '0', fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
                ⏳ Google Meet link being generated...
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#78350F' }}>
                Your conference is being created via Google Calendar and will be available in your calendar invite and confirmation email.
              </p>
            </div>
          )}

          {bookingResult?.meetingStatus === 'failed' && (
            <div style={{ padding: '14px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px' }}>
              <p style={{ margin: '0', fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>
                ⚠️ Meeting Link Notice
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#7F1D1D' }}>
                Automated video link generation is unavailable. Your host will provide meeting details directly.
              </p>
            </div>
          )}

          {(!bookingResult?.meetingStatus || bookingResult.meetingStatus === 'none') && eventType.location !== 'google-meet' && (
            <div style={{ padding: '12px 16px', backgroundColor: '#F3F4F6', borderRadius: '12px', fontSize: '13px', color: '#374151' }}>
              <strong>Location:</strong> {eventType.location.startsWith('custom-link:') ? eventType.location.slice('custom-link:'.length) : eventType.location === 'phone' ? 'Phone call' : eventType.location === 'in-person' ? 'In-person meeting' : eventType.location}
            </div>
          )}
        </div>

        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '20px' }}>
          A confirmation email and calendar invitation have been dispatched to <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '880px',
        margin: '40px auto',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Left Details Sidebar */}
      <div style={{ backgroundColor: '#F8F7F3', padding: '32px', borderRight: '1px solid #E5E7EB' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#4359E8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {team.name}
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#20231F', marginTop: '6px', marginBottom: '16px' }}>
          {eventType.name}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#4B5563', marginBottom: '24px' }}>
          <div>⏱️ {eventType.durationMinutes} minutes</div>
          <div>📍 {eventType.location}</div>
          <div>👥 Round-robin assignment ({eligibleHostsCount} hosts)</div>
        </div>

        {eventType.description && (
          <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
            {eventType.description}
          </p>
        )}
      </div>

      {/* Right Selection & Booking Form Pane */}
      <div style={{ padding: '32px' }}>
        {!selectedSlot ? (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#20231F', marginBottom: '4px' }}>
              Select a Time
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
              Timezone: <strong>{guestTimezone}</strong>
            </p>

            {parsedSlots.length === 0 ? (
              <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No available time slots found.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                {parsedSlots.map((slot) => (
                  <button
                    key={slot.toISOString()}
                    onClick={() => setSelectedSlotIso(slot.toISOString())}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#20231F',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {formatInTimeZone(slot, guestTimezone, 'MMM d, h:mm a')}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setSelectedSlotIso(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#4359E8',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              ← Back to times
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#20231F', marginBottom: '4px' }}>
              Confirm your details
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
              {selectedSlot && `${formatInTimeZone(selectedSlot, guestTimezone, 'EEEE, MMMM d, yyyy · h:mm a')} (${guestTimezone})`}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FormField
                id="name"
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <FormField
                id="email"
                label="Your Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && <p style={{ color: '#DC2626', fontSize: '13px' }}>{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#4359E8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                {isSubmitting ? 'Reserving...' : 'Confirm Team Booking'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
