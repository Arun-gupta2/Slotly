/**
 * Returns the application base URL dynamically across environments:
 * 1. NEXTAUTH_URL (custom configured domain)
 * 2. NEXT_PUBLIC_APP_URL (client/server shared domain)
 * 3. VERCEL_URL (auto-injected by Vercel in preview and production deployments)
 * 4. Window location origin (when called in browser)
 * 5. Fallback to http://localhost:3000
 */
export function getBaseUrl(): string {
  // If running in browser, always use current browser origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // NextAuth configured URL
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/+$/, '');
  }

  // Custom public app URL if defined
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }

  // Vercel deployment URL (e.g. your-project.vercel.app)
  if (process.env.VERCEL_URL) {
    const protocol = process.env.VERCEL_ENV === 'development' ? 'http' : 'https';
    return `${protocol}://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  }

  return 'http://localhost:3000';
}
