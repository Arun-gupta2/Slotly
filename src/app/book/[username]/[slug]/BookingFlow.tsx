'use client';

import { useState, useMemo } from 'react';
import { addMinutes } from 'date-fns';
import { formatInTimeZone } from '@/lib/timezoneFormat';
import { createBooking } from '@/lib/actions';
import FormField from '@/components/ui/FormField';
import styles from './book.module.css';

export type SlotItem = {
  timeIso: string;
  isAvailable: boolean;
  status: 'available' | 'booked' | 'conflict' | 'past';
};

type Props = {
  host: { id: string; name: string; username?: string; timezone: string };
  eventType: { id: string; name: string; description: string; durationMinutes: number; location: string };
  slots?: SlotItem[];
  availableSlots?: Date[]; // backwards compatibility
};

export default function BookingFlow({ host, eventType, slots, availableSlots }: Props) {
  // Normalize slots list
  const normalizedSlots: SlotItem[] = useMemo(() => {
    if (slots && slots.length > 0) return slots;
    if (availableSlots && availableSlots.length > 0) {
      return availableSlots.map((d) => ({
        timeIso: typeof d === 'string' ? d : d.toISOString(),
        isAvailable: true,
        status: 'available' as const,
      }));
    }
    return [];
  }, [slots, availableSlots]);

  // Detected or selected timezone
  const [guestTimezone, setGuestTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || host.timezone || 'UTC';
    } catch {
      return host.timezone || 'UTC';
    }
  });

  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [bookedSlotIsos, setBookedSlotIsos] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookingResult, setBookingResult] = useState<{
    bookingId?: string;
    managementToken?: string;
    meetingUrl?: string | null;
    meetingStatus?: string;
  } | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const timezonesList = useMemo(() => {
    try {
      if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
        return (Intl as any).supportedValuesOf('timeZone') as string[];
      }
    } catch {}
    return [
      'UTC',
      'Asia/Calcutta',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Australia/Sydney',
    ];
  }, []);

  // Group slots by date in guest's chosen timezone
  const daysMap = useMemo(() => {
    const groups: Record<
      string,
      {
        dateKey: string;
        dayName: string;
        dayFormatted: string;
        fullDateLabel: string;
        slots: SlotItem[];
        availableCount: number;
        hasAvailable: boolean;
      }
    > = {};

    for (const rawSlot of normalizedSlots) {
      const isBookedLocally = bookedSlotIsos.includes(rawSlot.timeIso);
      const slot: SlotItem = isBookedLocally
        ? { ...rawSlot, isAvailable: false, status: 'booked' }
        : rawSlot;

      const dateObj = new Date(slot.timeIso);
      let dateKey = '';
      let dayName = '';
      let dayFormatted = '';
      let fullDateLabel = '';

      try {
        dateKey = formatInTimeZone(dateObj, guestTimezone, 'yyyy-MM-dd');
        dayName = formatInTimeZone(dateObj, guestTimezone, 'EEE');
        dayFormatted = formatInTimeZone(dateObj, guestTimezone, 'MMM d');
        fullDateLabel = formatInTimeZone(dateObj, guestTimezone, 'EEEE, MMMM d, yyyy');
      } catch {
        // Fallback if timezone string is invalid
        dateKey = dateObj.toISOString().split('T')[0];
        dayName = 'Day';
        dayFormatted = dateKey;
        fullDateLabel = dateKey;
      }

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          dayName,
          dayFormatted,
          fullDateLabel,
          slots: [],
          availableCount: 0,
          hasAvailable: false,
        };
      }

      groups[dateKey].slots.push(slot);
      if (slot.isAvailable) {
        groups[dateKey].availableCount += 1;
        groups[dateKey].hasAvailable = true;
      }
    }

    return Object.values(groups);
  }, [normalizedSlots, guestTimezone]);

  // Ensure an active date is selected
  const activeDateGroup = useMemo(() => {
    if (!daysMap.length) return null;
    if (selectedDateKey) {
      const found = daysMap.find((d) => d.dateKey === selectedDateKey);
      if (found) return found;
    }
    // Auto-select first date with available slots, or first day
    const firstAvailable = daysMap.find((d) => d.hasAvailable) || daysMap[0];
    return firstAvailable;
  }, [daysMap, selectedDateKey]);

  const currentSelectedDateKey = activeDateGroup ? activeDateGroup.dateKey : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlotIso) return;

    setIsSubmitting(true);
    setError('');

    try {
      const slotDate = new Date(selectedSlotIso);
      const res = await createBooking({
        eventTypeId: eventType.id,
        userId: host.id,
        guestName: name,
        guestEmail: email,
        startTime: slotDate,
        endTime: addMinutes(slotDate, eventType.durationMinutes),
        guestTimezone,
      });
      setBookingResult(res);
      setBookedSlotIsos((prev) => (selectedSlotIso ? [...prev, selectedSlotIso] : prev));
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess && selectedSlotIso) {
    const slotDate = new Date(selectedSlotIso);
    const bookedTimeFormatted = formatInTimeZone(slotDate, guestTimezone, 'EEEE, MMMM d, yyyy · h:mm a');
    return (
      <div className={styles.card}>
        <div className={styles.mainPane}>
          <div className={styles.successPane}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.successTitle}>Booking confirmed</h1>
            <p className={styles.successBody}>
              You are scheduled with <strong>{host.name}</strong>.
              <br />
              <strong>{bookedTimeFormatted} ({guestTimezone})</strong>
            </p>

            {/* Meeting link / location details */}
            <div style={{ marginTop: '20px', width: '100%', maxWidth: '440px' }}>
              {bookingResult?.meetingStatus === 'ready' && bookingResult.meetingUrl && (
                <div style={{ padding: '16px', backgroundColor: '#EEF2FF', border: '1.5px solid #C7D2FE', borderRadius: '12px', textAlign: 'left' }}>
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
                <div style={{ padding: '14px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '12px', textAlign: 'left' }}>
                  <p style={{ margin: '0', fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
                    ⏳ Google Meet link being generated...
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#78350F' }}>
                    Your video conference is being synchronized with the host&apos;s calendar and will appear on your confirmation email and booking page.
                  </p>
                </div>
              )}

              {bookingResult?.meetingStatus === 'failed' && (
                <div style={{ padding: '14px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', textAlign: 'left' }}>
                  <p style={{ margin: '0', fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>
                    ⚠️ Meeting Link Notice
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#7F1D1D' }}>
                    Automated video link generation is unavailable. Your host will provide meeting details directly.
                  </p>
                </div>
              )}

              {(!bookingResult?.meetingStatus || bookingResult.meetingStatus === 'none') && eventType.location !== 'google-meet' && (
                <div style={{ padding: '12px 16px', backgroundColor: '#F3F4F6', borderRadius: '12px', textAlign: 'left', fontSize: '13px', color: '#374151' }}>
                  <strong>Location:</strong> {eventType.location.startsWith('custom-link:') ? eventType.location.slice('custom-link:'.length) : eventType.location === 'phone' ? 'Phone call' : eventType.location === 'in-person' ? 'In-person meeting' : eventType.location}
                </div>
              )}
            </div>

            <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '20px' }}>
              An invitation with calendar details has been sent to <strong>{email}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedSlotDate = selectedSlotIso ? new Date(selectedSlotIso) : null;

  return (
    <div className={styles.card}>
      {/* ── Left Sidebar (Details) ── */}
      <div className={styles.sidebar}>
        <p className={styles.hostName}>{host.name}</p>
        <h1 className={styles.eventName}>{eventType.name}</h1>

        <div className={styles.metaList}>
          <div className={styles.metaItem}>
            <span className={styles.metaIcon}>⏱️</span>
            {eventType.durationMinutes} min
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaIcon}>📍</span>
            {eventType.location}
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaIcon}>🌐</span>
            Host timezone: {host.timezone}
          </div>
        </div>

        {eventType.description && (
          <p className={styles.description}>{eventType.description}</p>
        )}
      </div>

      {/* ── Right Pane (Selection & Form) ── */}
      <div className={styles.mainPane}>
        {!selectedSlotIso ? (
          <>
            <h2 className={styles.paneTitle}>Select a Date & Time</h2>

            {/* Timezone Selector Bar */}
            <div className={styles.timezoneBar}>
              <div className={styles.timezoneSelectWrapper}>
                <span>🌍 Timezone:</span>
                <select
                  value={guestTimezone}
                  onChange={(e) => setGuestTimezone(e.target.value)}
                  className={styles.timezoneSelect}
                >
                  {timezonesList.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              {host.timezone && (
                <span className={styles.hostTzBadge}>
                  Host operates in: {host.timezone}
                </span>
              )}
            </div>

            {daysMap.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>No times available this week.</p>
            ) : (
              <>
                {/* ── Date Picker Horizontal Chips ── */}
                <div className={styles.datePickerSection}>
                  <p className={styles.datePickerLabel}>Select a date</p>
                  <div className={styles.datesRow}>
                    {daysMap.map((dayGroup) => {
                      const isSelected = dayGroup.dateKey === currentSelectedDateKey;
                      const isDisabled = !dayGroup.hasAvailable;

                      return (
                        <button
                          key={dayGroup.dateKey}
                          type="button"
                          onClick={() => setSelectedDateKey(dayGroup.dateKey)}
                          className={`${styles.dateChip} ${
                            isSelected ? styles.dateChipActive : ''
                          } ${isDisabled ? styles.dateChipDisabled : ''}`}
                        >
                          <span className={styles.dateChipDay}>{dayGroup.dayName}</span>
                          <span className={styles.dateChipDate}>{dayGroup.dayFormatted}</span>
                          <span className={styles.dateChipBadge}>
                            {dayGroup.hasAvailable
                              ? `${dayGroup.availableCount} open`
                              : '0 open'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Time Slots for Selected Date ── */}
                {activeDateGroup && (
                  <div>
                    <div className={styles.slotsHeading}>
                      <span>
                        Available times for {activeDateGroup.fullDateLabel}
                      </span>
                      <div className={styles.slotsLegend}>
                        <span>
                          <span className={styles.legendDotAvailable}></span> Available
                        </span>
                        <span>
                          <span className={styles.legendDotTaken}></span> Booked / Unavailable
                        </span>
                      </div>
                    </div>

                    <div className={styles.slotsGrid}>
                      {activeDateGroup.slots.map((slot) => {
                        const slotDate = new Date(slot.timeIso);
                        const timeStr = formatInTimeZone(slotDate, guestTimezone, 'h:mm a');

                        if (slot.isAvailable) {
                          return (
                            <button
                              key={slot.timeIso}
                              type="button"
                              onClick={() => setSelectedSlotIso(slot.timeIso)}
                              className={styles.slotBtn}
                            >
                              <span>{timeStr}</span>
                            </button>
                          );
                        }

                        // Unavailable or Booked Slot: Faded, non-clickable
                        return (
                          <button
                            key={slot.timeIso}
                            type="button"
                            disabled
                            aria-disabled="true"
                            className={`${styles.slotBtn} ${styles.slotBtnUnavailable}`}
                            title={`This time slot is ${slot.status === 'booked' ? 'already booked' : 'unavailable'}`}
                          >
                            <span style={{ textDecoration: 'line-through' }}>{timeStr}</span>
                            <span className={styles.takenBadge}>
                              {slot.status === 'booked' ? 'Taken' : 'Unavailable'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setSelectedSlotIso(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-accent)',
                cursor: 'pointer',
                marginBottom: 'var(--space-6)',
                fontWeight: 600,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ← Back to available times
            </button>

            <h2 className={styles.paneTitle}>Confirm your details</h2>

            {selectedSlotDate && (
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 'var(--space-6)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text)', marginBottom: '4px' }}>
                  📅 {formatInTimeZone(selectedSlotDate, guestTimezone, 'EEEE, MMMM d, yyyy · h:mm a')}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                  Time shown in: <strong>{guestTimezone}</strong>
                  {guestTimezone !== host.timezone && (
                    <> · ({formatInTimeZone(selectedSlotDate, host.timezone, 'h:mm a')} in host&apos;s timezone: {host.timezone})</>
                  )}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <FormField
                id="guestName"
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Jane Doe"
              />
              <FormField
                id="guestEmail"
                label="Your Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="e.g. jane@example.com"
              />

              {error && (
                <p style={{ color: '#DC2626', fontSize: 'var(--text-sm)' }}>
                  {error}
                </p>
              )}

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
