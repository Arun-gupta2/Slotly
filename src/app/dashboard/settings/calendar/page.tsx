import { getCalendarConnection, disconnectCalendar } from '@/lib/actions';
import CalendarSettingsClient from './CalendarSettingsClient';
import styles from '../settings.module.css'; // Assume there is a shared settings module or just reuse

export default async function CalendarSettingsPage() {
  const connection = await getCalendarConnection();
  
  const isConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Calendar Connections</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-8)' }}>
        Connect your external calendar to automatically check for conflicts and add new bookings.
      </p>

      {!isConfigured && (
        <div style={{ padding: 'var(--space-4)', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)' }}>
          <strong>Google OAuth Missing</strong>
          <p>Google Client credentials are not configured in your environment. You must set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.</p>
        </div>
      )}

      <div style={{ padding: 'var(--space-6)', backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>Google Calendar</h2>
            <p style={{ color: 'var(--color-muted)', marginTop: 'var(--space-1)' }}>
              {connection 
                ? `Connected to ${connection.email}` 
                : 'Check your availability and sync meetings directly to Google Calendar.'}
            </p>
          </div>
          
          <CalendarSettingsClient 
            isConnected={!!connection} 
            isConfigured={isConfigured} 
            disconnectAction={disconnectCalendar} 
          />
        </div>

        {connection && (
          <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Conflict Checking</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
              Slotly is currently checking your primary calendar for conflicts to prevent double booking.
            </p>
            <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Event Synchronization</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>
              Confirmed bookings will be automatically added to your primary calendar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
