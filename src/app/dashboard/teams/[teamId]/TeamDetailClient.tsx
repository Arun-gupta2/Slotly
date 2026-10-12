'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { inviteTeamMember, removeTeamMember, renameTeam, leaveTeam } from '@/lib/team-actions';
import FormField from '@/components/ui/FormField';

type Props = {
  team: any;
};

export default function TeamDetailClient({ team }: Props) {
  const router = useRouter();

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ text: string; isError: boolean; inviteUrl?: string } | null>(null);

  // Rename state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newTeamName, setNewTeamName] = useState(team.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');

  // General state
  const [actionError, setActionError] = useState('');
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  const isOwner = team.currentUserRole === 'owner';

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteMessage(null);

    try {
      const res = await inviteTeamMember(team.id, inviteEmail);
      setInviteMessage({ text: res.message, isError: false, inviteUrl: res.inviteUrl });
      setInviteEmail('');
      router.refresh();
    } catch (err: any) {
      setInviteMessage({ text: err.message || 'Failed to send invitation', isError: true });
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;

    setLoadingMemberId(memberId);
    setActionError('');

    try {
      await removeTeamMember(team.id, memberId);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove member');
    } finally {
      setLoadingMemberId(null);
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim() || newTeamName === team.name) return;

    setIsRenaming(true);
    setRenameError('');

    try {
      await renameTeam(team.id, newTeamName);
      setIsEditingName(false);
      router.refresh();
    } catch (err: any) {
      setRenameError(err.message || 'Failed to rename team');
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleLeaveTeam() {
    if (!confirm('Are you sure you want to leave this team?')) return;

    setActionError('');
    try {
      await leaveTeam(team.id);
      router.push('/dashboard/teams');
    } catch (err: any) {
      setActionError(err.message || 'Failed to leave team');
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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

      {actionError && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)' }}>
          {actionError}
        </div>
      )}

      {/* Header card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-8)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {!isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-main)' }}>
                  {team.name}
                </h1>
                {isOwner && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-accent)',
                      fontSize: 'var(--text-xs)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Rename
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleRename} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--text-md)',
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={isRenaming}
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 12px',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  style={{
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 12px',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  Cancel
                </button>
              </form>
            )}
            {renameError && <p style={{ color: '#DC2626', fontSize: 'var(--text-xs)', marginTop: '4px' }}>{renameError}</p>}
            <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)', marginTop: '6px' }}>
              Public Team Slug: <code>/team/{team.slug}</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleLeaveTeam}
              style={{
                backgroundColor: '#FFF1F2',
                color: '#E11D48',
                border: '1px solid #FECDD3',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
              }}
            >
              Leave Team
            </button>
          </div>
        </div>
      </div>

      {/* ── Team Event Types Section ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-8)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-main)' }}>
              Team Event Types
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
              Configure round-robin event types hosted by this team.
            </p>
          </div>
          <Link
            href={`/dashboard/teams/${team.id}/events/new`}
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-xs)',
              textDecoration: 'none',
            }}
          >
            + New Team Event Type
          </Link>
        </div>

        {team.eventTypes.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '24px 0' }}>
            No team event types created yet. Click above to create one!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {team.eventTypes.map((event: any) => {
              const bookingUrl = `${baseUrl}/team/${team.slug}/${event.slug}`;
              return (
                <div
                  key={event.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-text-main)' }}>
                        {event.name}
                      </h3>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: event.status === 'published' ? '#D1FAE5' : '#FEF3C7',
                          color: event.status === 'published' ? '#065F46' : '#92400E',
                        }}
                      >
                        {event.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginTop: '4px' }}>
                      ⏱️ {event.durationMinutes} min &nbsp;•&nbsp; 👥 {event.teamEventMembers.length} eligible hosts
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: '4px' }}>
                      <a href={`/team/${team.slug}/${event.slug}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                        {bookingUrl} ↗
                      </a>
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/teams/${team.id}/events/${event.id}/edit`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--color-text-main)',
                      textDecoration: 'none',
                    }}
                  >
                    Edit
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Members Management Section ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-8)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 'var(--space-4)' }}>
          Team Members ({team.members.length})
        </h2>

        {/* Invite Member Form (if owner) */}
        {isOwner && (
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '10px', marginBottom: 'var(--space-6)', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                type="email"
                placeholder="Enter colleague's email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--text-sm)',
                }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isInviting}
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '10px 18px',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
              }}
            >
              {isInviting ? 'Inviting...' : 'Invite Member'}
            </button>
          </form>
        )}

        {inviteMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: inviteMessage.isError ? '#FEE2E2' : '#F0FDF4',
              border: `1px solid ${inviteMessage.isError ? '#FCA5A5' : '#BBF7D0'}`,
              marginBottom: 'var(--space-6)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: inviteMessage.isError ? '#DC2626' : '#15803D',
                marginBottom: inviteMessage.inviteUrl ? '8px' : '0',
              }}
            >
              {inviteMessage.text}
            </p>
            {inviteMessage.inviteUrl && (
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: '#374151', marginBottom: '6px' }}>
                  Share this invitation link with the member:
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={inviteMessage.inviteUrl}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: 'var(--text-xs)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#ffffff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (inviteMessage.inviteUrl) {
                        navigator.clipboard.writeText(inviteMessage.inviteUrl);
                        alert('Invitation link copied to clipboard!');
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      backgroundColor: '#15803D',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Members Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontSize: 'var(--text-xs)' }}>
                <th style={{ padding: '10px 12px' }}>USER</th>
                <th style={{ padding: '10px 12px' }}>ROLE</th>
                <th style={{ padding: '10px 12px' }}>STATUS</th>
                {isOwner && <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {team.members.map((m: any) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                      {m.user ? m.user.name : m.email}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>{m.email}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: m.role === 'owner' ? '#EEF2FF' : '#F3F4F6',
                        color: m.role === 'owner' ? '#4359E8' : '#4B5563',
                      }}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: m.status === 'active' ? '#D1FAE5' : '#FEF3C7',
                        color: m.status === 'active' ? '#065F46' : '#92400E',
                      }}
                    >
                      {m.status}
                    </span>
                  </td>
                  {isOwner && (
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {m.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          disabled={loadingMemberId === m.id}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
