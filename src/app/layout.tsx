import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import './globals.css';

/**
 * Root layout — wraps every page.
 *
 * Design decision: fonts are loaded via CSS @import in globals.css
 * rather than the next/font helpers so they stay co-located with
 * the rest of the design token system. This keeps the layout file
 * focused on structure and metadata only.
 */
export const metadata: Metadata = {
  title: {
    default: 'Slotly — Scheduling that gets out of the way',
    template: '%s | Slotly',
  },
  description:
    'Slotly helps you share your availability, let guests book a time, and skip the back-and-forth emails. Simple, fast, and designed for real people.',
  keywords: ['scheduling', 'calendar', 'booking', 'availability', 'meetings'],
  authors: [{ name: 'Slotly' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://slotly.app',
    siteName: 'Slotly',
    title: 'Slotly — Scheduling that gets out of the way',
    description:
      'Share your availability and let guests pick a time. No back-and-forth.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Slotly — Scheduling that gets out of the way',
    description:
      'Share your availability and let guests pick a time. No back-and-forth.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
