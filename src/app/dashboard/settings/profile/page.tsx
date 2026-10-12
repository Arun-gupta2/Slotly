import { getSessionUser } from '@/lib/actions';
import SettingsForm from '../SettingsForm';
import styles from '../settings.module.css';

export const metadata = {
  title: 'Profile Settings - Slotly',
};

export default async function ProfileSettingsPage() {
  const user = await getSessionUser();

  const initialData = {
    name: user.name,
    username: user.username,
    bio: user.bio || '',
    timezone: user.timezone,
    email: user.email,
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Account</p>
        <h1 className={styles.heading}>Profile Settings</h1>
        <p className={styles.subheading}>
          Manage your personal details and public booking link.
        </p>
      </header>
      
      <SettingsForm initialData={initialData} />
    </div>
  );
}
