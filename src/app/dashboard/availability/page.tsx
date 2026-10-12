import { getAvailabilitySettings } from '@/lib/actions';
import AvailabilityForm from './AvailabilityForm';
import styles from './availability.module.css';

export const metadata = {
  title: 'Availability - Slotly',
};

export default async function AvailabilityPage() {
  const settings = await getAvailabilitySettings();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Management</p>
        <h1 className={styles.heading}>Availability</h1>
        <p className={styles.subheading}>
          Define when you&apos;re open for meetings and configure your scheduling rules.
        </p>
      </header>
      
      <AvailabilityForm initialSettings={settings} />
    </div>
  );
}
