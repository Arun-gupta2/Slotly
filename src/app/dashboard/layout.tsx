import type { Metadata } from 'next';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | Slotly Dashboard',
  },
  description: 'Manage your Slotly event types, bookings, and availability.',
  robots: { index: false, follow: false },
};

/**
 * Dashboard layout — wraps all /dashboard/* routes in:
 *  1. ToastProvider (context for success/error feedback)
 *  2. DashboardShell (sidebar + main content area)
 *
 * The landing page (/) is NOT affected — it has its own root layout.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DashboardShell>{children}</DashboardShell>
    </ToastProvider>
  );
}
