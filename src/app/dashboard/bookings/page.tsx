import { getHostBookings } from '@/lib/actions';
import BookingsList from './BookingsList';
// Reuse existing dashboard header styles or local ones
import styles from '../dashboard.module.css';

export const metadata = {
  title: 'Bookings - Slotly',
};

export default async function BookingsPage() {
  const bookings = await getHostBookings();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.greeting}>Management</p>
        <h1 className={styles.heading}>Bookings</h1>
        <p className={styles.subheading}>
          View and manage your upcoming and past meetings.
        </p>
      </header>
      
      <BookingsList initialBookings={bookings} />
    </div>
  );
}
