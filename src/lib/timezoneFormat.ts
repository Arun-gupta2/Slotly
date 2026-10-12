/**
 * Formats a date in a specific timezone using standard Intl.DateTimeFormat.
 * Avoids date-fns-tz bundler issues in Next.js production builds.
 */
export function formatInTimeZone(date: Date | string, timeZone: string, pattern: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tz = timeZone || 'UTC';

  try {
    if (pattern === 'yyyy-MM-dd') {
      return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    }

    if (pattern === 'EEE') {
      return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(d);
    }

    if (pattern === 'MMM d') {
      return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric' }).format(d);
    }

    if (pattern === 'EEEE, MMMM d, yyyy') {
      return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
    }

    if (pattern === 'h:mm a') {
      return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
    }

    if (pattern === 'MMM d, h:mm a') {
      const datePart = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric' }).format(d);
      const timePart = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
      return `${datePart}, ${timePart}`;
    }

    if (pattern === 'EEEE, MMMM d, yyyy · h:mm a') {
      const datePart = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
      const timePart = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
      return `${datePart} · ${timePart}`;
    }

    return new Intl.DateTimeFormat('en-US', { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch (err) {
    // If timezone is invalid fallback to UTC
    return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }).format(d);
  }
}
