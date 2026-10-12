'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitation, declineInvitation } from '@/lib/team-actions';

type Props = {
  invitations: any[];
};

export default function PendingInvitationsList({ invitations }: Props) {
  const router = useRouter();
  const [loadingToken, setLoadingToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleAccept(rawTokenHash: string, inviteTokenHash: string) {
    // Note: if user has pending invitations listed, we can use their invite token or invite ID
    setLoadingToken(inviteTokenHash);
    setError('');

    try {
      // For listed invites where user is logged in, we accept by finding the matching token hash or token
      await acceptInvitation(inviteTokenHash);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setLoadingToken(null);
    }
  }

  async function handleDecline(inviteTokenHash: string) {
    setLoadingToken(inviteTokenHash);
    setError('');

    try {
      await declineInvitation(inviteTokenHash);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation');
    } finally {
      setLoadingToken(null);
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFBEB',
        border: '1px solid #FCD34D',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-8)',
      }}
    >
      <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: '#92400E', marginBottom: 'var(--space-3)' }}>
        📩 Pending Team Invitations ({invitations.length})
      </h2>
      {error && <p style={{ color: '#DC2626', fontSize: 'var(--text-sm)', marginBottom: '12px' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {invitations.map((inv) => (
          <div
            key={inv.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #FDE68A',
            }}
          >
            <div>
              <p style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: 'var(--text-sm)' }}>
                {inv.team.name}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                Invited as <strong>{inv.role}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleAccept(inv.inviteTokenHash, inv.inviteTokenHash)}
                disabled={loadingToken === inv.inviteTokenHash}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)',
                  cursor: 'pointer',
                }}
              >
                Accept
              </button>
              <button
                onClick={() => handleDecline(inv.inviteTokenHash)}
                disabled={loadingToken === inv.inviteTokenHash}
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)',
                  cursor: 'pointer',
                }}
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
