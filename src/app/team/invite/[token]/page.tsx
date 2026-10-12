'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getInvitationByToken, acceptInvitation, declineInvitation } from '@/lib/team-actions';
import Link from 'next/link';

export default function TeamInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [inviteData, setInviteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    getInvitationByToken(token)
      .then((res) => {
        if (!res) {
          setError('Invalid or non-existent invitation link.');
        } else if (res.expired) {
          setError('This invitation link has expired.');
        } else {
          setInviteData(res.invite);
        }
      })
      .catch((err) => setError(err.message || 'Failed to load invitation details'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setActionLoading(true);
    setError('');

    try {
      const res = await acceptInvitation(token);
      setIsSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/teams/${res.teamId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. Make sure you are logged in with the invited email.');
      setActionLoading(false);
    }
  }

  async function handleDecline() {
    setActionLoading(true);
    setError('');

    try {
      await declineInvitation(token);
      router.push('/dashboard/teams');
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation.');
      setActionLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F7F3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '36px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          border: '1px solid #E5E7EB',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '42px', marginBottom: '16px' }}>🎉</div>

        {loading ? (
          <p style={{ color: '#6B7280' }}>Verifying invitation link...</p>
        ) : error ? (
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              Invitation Error
            </h1>
            <p style={{ color: '#DC2626', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
            <Link
              href="/dashboard/teams"
              style={{
                display: 'inline-block',
                backgroundColor: '#4359E8',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Go to Dashboard
            </Link>
          </div>
        ) : isSuccess ? (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginBottom: '8px' }}>
              Invitation Accepted!
            </h1>
            <p style={{ color: '#4B5563', fontSize: '14px' }}>
              Welcome to <strong>{inviteData?.team.name}</strong>. Redirecting to team dashboard...
            </p>
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              Team Invitation
            </h1>
            <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '20px' }}>
              You have been invited to join <strong>{inviteData?.team.name}</strong> as a <strong>{inviteData?.role}</strong>.
            </p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '24px' }}>
              Invited email: <code>{inviteData?.email}</code>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleDecline}
                disabled={actionLoading}
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                style={{
                  backgroundColor: '#4359E8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                {actionLoading ? 'Accepting...' : 'Accept Invitation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
