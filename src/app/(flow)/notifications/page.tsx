import type { Metadata } from 'next';
import { getNotifications } from '@/lib/api/notifications';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';

export const metadata: Metadata = { title: 'الإشعارات' };

export default async function NotificationsPage() {
  const notifications = await getNotifications();
  return <NotificationsScreen notifications={notifications} />;
}
