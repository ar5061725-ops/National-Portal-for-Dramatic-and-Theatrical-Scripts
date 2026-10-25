import { ROUTES } from '@/config/routes';
import type { AppNotification } from '@/types';
import { wait } from './client';

const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'تمت إجازة نصك',
    body: '«بيت على البحر» حصل على الإجازة بتقييم 9/10. شهادتك جاهزة.',
    time: 'منذ ساعتين',
    unread: true,
    tone: 'success',
    icon: 'check',
    href: ROUTES.certificate('bayt-ala-albahr'),
  },
  {
    id: 'n2',
    title: 'ملاحظات جديدة من اللجنة',
    body: '«رسائل من الماضي» يحتاج بعض التعديلات قبل الإجازة.',
    time: 'أمس',
    unread: true,
    tone: 'warning',
    icon: 'warning',
    href: ROUTES.feedback('req-1'),
  },
  {
    id: 'n3',
    title: 'بدأت مراجعة نصك',
    body: '«ظل النخلة» الآن قيد المراجعة لدى اللجنة.',
    time: 'قبل 3 أيام',
    unread: false,
    tone: 'info',
    icon: 'clock',
    href: ROUTES.requests,
  },
  {
    id: 'n4',
    title: 'تم الدفع بنجاح',
    body: 'استلمنا رسوم تقديم «ظل النخلة»، والإيصال متاح في حسابك.',
    time: 'قبل 5 أيام',
    unread: false,
    tone: 'info',
    icon: 'receipt',
    href: ROUTES.receipts,
  },
];

export async function getNotifications(): Promise<AppNotification[]> {
  await wait();
  return NOTIFICATIONS;
}
