/**
 * Slotly — Core domain types
 *
 * These types define the shape of every entity in Milestone 2.
 * The data layer (eventTypes.ts) is the only file that reads/writes
 * localStorage; all UI components receive plain typed props.
 *
 * Milestone 3 migration path:
 *   - Replace src/lib/eventTypes.ts with a Drizzle repository
 *   - Keep these types unchanged (or extend them with DB-specific fields)
 *   - Zero UI changes required
 */

export type MeetingLocation = 'google-meet' | 'custom-link' | 'phone' | 'in-person';
export type EventTypeStatus = 'published' | 'draft';
export type DurationMinutes = 15 | 30 | 45 | 60;

export interface EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: DurationMinutes;
  location: string;
  status: EventTypeStatus;
  /** URL-safe slug derived from the event name. */
  slug: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Shape of the form data for create / edit operations. */
export type EventTypeFormData = Omit<EventType, 'id' | 'createdAt' | 'updatedAt' | 'slug'>;

/** Validation errors keyed by field name. */
export type FormErrors = Partial<Record<keyof EventTypeFormData, string>>;

export const DURATION_OPTIONS: { value: DurationMinutes; label: string }[] = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
];

export const LOCATION_OPTIONS: { value: MeetingLocation; label: string; icon: string }[] = [
  { value: 'google-meet', label: 'Google Meet', icon: '📹' },
  { value: 'custom-link', label: 'External meeting URL', icon: '🔗' },
  { value: 'phone', label: 'Phone call', icon: '📞' },
  { value: 'in-person', label: 'In person', icon: '📍' },
];
