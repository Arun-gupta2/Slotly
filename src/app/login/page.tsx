'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormField from '@/components/ui/FormField';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', backgroundColor: 'var(--color-bg)' }}>
      <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none', color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)' }}>
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="7" fill="var(--color-accent)" />
            <rect x="7" y="11" width="14" height="1.5" rx="0.75" fill="white" opacity="0.4" />
            <rect x="7" y="15" width="8" height="1.5" rx="0.75" fill="white" opacity="0.4" />
            <rect x="7" y="7.5" width="3" height="3" rx="1.5" fill="white" />
            <rect x="18" y="7.5" width="3" height="3" rx="1.5" fill="white" />
            <circle cx="18" cy="18" r="3" fill="white" opacity="0.9" />
          </svg>
          <span>Slotly</span>
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-2xl)', padding: 'var(--space-8)', boxShadow: 'var(--shadow-xl)' }}>
        {/* ── Segmented Tab Switcher ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--color-bg)', padding: '4px', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)', border: '1px solid var(--color-border)' }}>
          <Link
            href="/login"
            style={{
              textAlign: 'center',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              boxShadow: 'var(--shadow-sm)',
              textDecoration: 'none',
            }}
          >
            Log in
          </Link>
          <Link
            href="/register"
            style={{
              textAlign: 'center',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              fontSize: 'var(--text-sm)',
              color: 'var(--color-muted)',
              textDecoration: 'none',
            }}
          >
            Sign up
          </Link>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Sign in to your account</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>Access your schedules, team events, and bookings.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField
            id="email"
            label="Email address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <div style={{ padding: 'var(--space-3)', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #DC2626', borderRadius: 'var(--radius-md)', color: '#DC2626', fontSize: 'var(--text-sm)' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-3)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 'var(--text-base)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: 'var(--space-2)',
              opacity: isLoading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </div>

      <p style={{ marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>
        <Link href="/" style={{ color: 'var(--color-muted)', textDecoration: 'none' }}>
          &larr; Back to Slotly homepage
        </Link>
      </p>
    </div>
  );
}
