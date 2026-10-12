import type { EventTypeStatus } from '@/lib/types';
import styles from './Badge.module.css';

type BadgeProps = {
  status: EventTypeStatus;
};

const LABELS: Record<EventTypeStatus, string> = {
  published: 'Published',
  draft: 'Draft',
};

/**
 * Badge — displays the published/draft status of an event type.
 * Uses a coloured dot + text label inside a pill shape.
 */
export default function Badge({ status }: BadgeProps) {
  return (
    <span
      className={[styles.badge, styles[status]].join(' ')}
      aria-label={`Status: ${LABELS[status]}`}
    >
      <span className={styles.dot} aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
