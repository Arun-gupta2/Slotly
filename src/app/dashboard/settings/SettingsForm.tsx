'use client';

import { useState } from 'react';
import { updateAccountSettings } from '@/lib/actions';
import FormField from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import styles from './settings.module.css';

const TIMEZONES = Intl.supportedValuesOf('timeZone');

type Props = {
  initialData: {
    name: string;
    username: string;
    bio: string;
    timezone: string;
    email: string;
  };
};

export default function SettingsForm({ initialData }: Props) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState(initialData.name);
  const [username, setUsername] = useState(initialData.username);
  const [bio, setBio] = useState(initialData.bio);
  const [timezone, setTimezone] = useState(() => {
    if (initialData.timezone && initialData.timezone !== 'UTC') {
      return initialData.timezone;
    }
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || initialData.timezone || 'UTC';
    } catch {
      return initialData.timezone || 'UTC';
    }
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      await updateAccountSettings({ name, username, bio, timezone });
      toast({ variant: 'success', title: 'Settings updated' });
    } catch (err: any) {
      setError(err.message || 'Error updating settings');
      toast({ variant: 'error', title: 'Could not save', message: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formCard}>
      <h2 className={styles.sectionTitle}>Profile details</h2>
      <p className={styles.sectionDesc}>Update your personal information and public booking link.</p>
      
      <div className={styles.formGrid}>
        <FormField
          id="email"
          label="Email address"
          value={initialData.email}
          onChange={() => {}}
          disabled
          hint="Your email address cannot be changed."
        />
        
        <FormField
          id="name"
          label="Display Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <FormField
            id="username"
            label="Username (Booking URL)"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            required
            hint={`Your public link will be: slotly.app/${username || 'username'}`}
          />
          <button 
            type="button" 
            className={styles.saveBtn} 
            style={{ marginBottom: '24px', padding: '10px 16px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/book/${username}`);
              toast({ variant: 'success', title: 'Copied to clipboard!' });
            }}
          >
            Copy URL
          </button>
        </div>

        <FormField
          as="textarea"
          id="bio"
          label="Short Biography"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          hint="Tell guests a bit about yourself. Keep it brief."
        />

        <FormField
          as="select"
          id="timezone"
          label="Default Timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </FormField>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={styles.saveBtn} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}
