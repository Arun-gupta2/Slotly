import Link from 'next/link';
import { getUserTeams, getPendingUserInvitations } from '@/lib/team-actions';
import PendingInvitationsList from './PendingInvitationsList';
import styles from '../dashboard.module.css';

export const metadata = {
  title: 'Teams',
  description: 'Manage your teams, members, and team event types.',
};

export default async function TeamsPage() {
  const teams = await getUserTeams();
  const pendingInvites = await getPendingUserInvitations();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-main)' }}>
            Teams
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            Collaborate with team members and host shared round-robin scheduling.
          </p>
        </div>
        <Link
          href="/dashboard/teams/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-accent)',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            textDecoration: 'none',
          }}
        >
          + Create Team
        </Link>
      </div>

      {/* Pending Invitations Section */}
      {pendingInvites.length > 0 && (
        <PendingInvitationsList invitations={pendingInvites} />
      )}

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-12)',
            textAlign: 'center',
            border: '1px border var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: 'var(--space-3)' }}>👥</div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-main)' }}>
            No teams yet
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)', maxWidth: '400px', margin: '8px auto 20px' }}>
            Create a team to invite colleagues, configure shared round-robin events, and balance meeting assignments automatically.
          </p>
          <Link
            href="/dashboard/teams/new"
            style={{
              display: 'inline-block',
              backgroundColor: 'var(--color-accent)',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              textDecoration: 'none',
            }}
          >
            Create your first team
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/dashboard/teams/${team.id}`}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                border: '1px solid var(--color-border)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-main)' }}>
                    {team.name}
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: team.userRole === 'owner' ? '#EEF2FF' : '#F3F4F6',
                      color: team.userRole === 'owner' ? '#4359E8' : '#4B5563',
                    }}
                  >
                    {team.userRole}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                  Slug: <code>/team/{team.slug}</code>
                </p>
              </div>

              <div
                style={{
                  marginTop: 'var(--space-6)',
                  paddingTop: 'var(--space-4)',
                  borderTop: '1px solid #F3F4F6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-muted)',
                }}
              >
                <span>{team.members.length} {team.members.length === 1 ? 'member' : 'members'}</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Manage team →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
