'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTeam } from '@/lib/team-actions';
import FormField from '@/components/ui/FormField';
import Link from 'next/link';

export default function NewTeamPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const team = await createTeam({ name });
      router.push(`/dashboard/teams/${team.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create team.');
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <Link
        href="/dashboard/teams"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--color-muted)',
          fontSize: 'var(--text-sm)',
          textDecoration: 'none',
          marginBottom: 'var(--space-6)',
        }}
      >
        ← Back to Teams
      </Link>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-8)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: 'var(--space-2)' }}>
          Create a new team
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
          Teams allow multiple hosts to share event types and balance bookings round-robin.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormField
            id="teamName"
            label="Team Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales Engineering, Product Support"
            required
          />

          {error && <p style={{ color: '#DC2626', fontSize: 'var(--text-sm)' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <Link
              href="/dashboard/teams"
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#F3F4F6',
                color: '#4B5563',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff',
                border: 'none',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
