'use client';

import { useState } from 'react';

export default function CalendarSettingsClient({
  isConnected,
  isConfigured,
  disconnectAction,
}: {
  isConnected: boolean;
  isConfigured: boolean;
  disconnectAction: () => Promise<void>;
}) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      await disconnectAction();
    } catch (e) {
      console.error(e);
      setIsDisconnecting(false);
    }
  }

  if (isConnected) {
    return (
      <button 
        onClick={handleDisconnect}
        disabled={isDisconnecting}
        style={{
          padding: 'var(--space-2) var(--space-4)',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          cursor: isDisconnecting ? 'not-allowed' : 'pointer',
        }}
      >
        {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
      </button>
    );
  }

  return (
    <a
      href={isConfigured ? "/api/calendar/connect" : "#"}
      onClick={(e) => !isConfigured && e.preventDefault()}
      style={{
        padding: 'var(--space-2) var(--space-4)',
        backgroundColor: isConfigured ? 'var(--color-accent)' : '#E5E7EB',
        color: isConfigured ? 'white' : '#9CA3AF',
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        textDecoration: 'none',
        cursor: isConfigured ? 'pointer' : 'not-allowed',
        display: 'inline-block'
      }}
    >
      Connect
    </a>
  );
}
