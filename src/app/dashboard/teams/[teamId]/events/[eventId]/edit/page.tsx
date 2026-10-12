'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { updateTeamEventType, deleteTeamEventType, getTeamDetails } from '@/lib/team-actions';
import FormField from '@/components/ui/FormField';
import Link from 'next/link';

export default function EditTeamEventTypePage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;
  const eventId = params.eventId as string;

  const [team, setTeam] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [location, setLocation] = useState('google-meet');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTeamDetails(teamId)
      .then((t) => {
        setTeam(t);
        const eventType = t.eventTypes.find((e: any) => e.id === eventId);
        if (eventType) {
          setName(eventType.name);
          setDescription(eventType.description || '');
          setDurationMinutes(eventType.durationMinutes);
          setLocation(eventType.location);
          setStatus(eventType.status === 'draft' ? 'draft' : 'published');
          const eligibleIds = eventType.teamEventMembers.map((tem: any) => tem.user.id);
          setSelectedUserIds(eligibleIds);
        } else {
          setError('Event type not found');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [teamId, eventId]);

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (selectedUserIds.length === 0) {
      setError('Please select at least one eligible team member.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await updateTeamEventType(teamId, eventId, {
        name,
        description,
        durationMinutes: Number(durationMinutes),
        location,
        status,
        eligibleUserIds: selectedUserIds,
      });
      router.push(`/dashboard/teams/${teamId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update team event type');
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this team event type?')) return;

    setIsDeleting(true);
    setError('');

    try {
      await deleteTeamEventType(teamId, eventId);
      router.push(`/dashboard/teams/${teamId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete team event type');
      setIsDeleting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading event type details...</div>;
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <Link
        href={`/dashboard/teams/${teamId}`}
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
        ← Back to Team
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-main)' }}>
            Edit Team Event Type
          </h1>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              backgroundColor: '#FFF1F2',
              color: '#E11D48',
              border: '1px solid #FECDD3',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Event Type'}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormField
            id="name"
            label="Event Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--text-sm)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '6px' }}>
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--text-sm)',
                  backgroundColor: '#fff',
                }}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '6px' }}>
                Location
              </label>
              <select
                value={location.startsWith('custom-link') ? 'custom-link' : location}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom-link') {
                    setLocation('custom-link:');
                  } else {
                    setLocation(val);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--text-sm)',
                  backgroundColor: '#fff',
                }}
              >
                <option value="google-meet">Google Meet</option>
                <option value="custom-link">External Meeting URL</option>
                <option value="phone">Phone Call</option>
                <option value="in-person">In Person</option>
              </select>

              {location.startsWith('custom-link') && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/... or https://teams.microsoft.com/..."
                    value={location.startsWith('custom-link:') ? location.slice('custom-link:'.length) : ''}
                    onChange={(e) => setLocation(`custom-link:${e.target.value.trim()}`)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--text-sm)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Eligible Team Members Checkboxes */}
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '8px' }}>
              Eligible Team Hosts (Round-Robin Assignees)
            </label>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {team?.members.filter((m: any) => m.status === 'active' && m.user).map((m: any) => (
                <label key={m.user.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(m.user.id)}
                    onChange={() => toggleUser(m.user.id)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
                  />
                  <span>
                    <strong>{m.user.name}</strong> ({m.user.email})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '6px' }}>
              Publication Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--text-sm)',
                backgroundColor: '#fff',
              }}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {error && <p style={{ color: '#DC2626', fontSize: 'var(--text-sm)' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <Link
              href={`/dashboard/teams/${teamId}`}
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
