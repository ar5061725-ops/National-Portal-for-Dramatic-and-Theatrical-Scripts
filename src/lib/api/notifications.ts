import { ROUTES } from '@/config/routes';
import type { AppNotification } from '@/types';
import { wait } from './client';

const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'تمت إجازة نصك',
    body: '«بيت على البحر» حصل على الإجازة بتقييم 9/10. شهادتك جاهزة.',
    time: 'منذ ساعتين',
    requestNo: 'NSP-2026-0001',
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
    requestNo: 'NSP-2026-0003',
    unread: true,
    tone: 'warning',
    icon: 'warning',
    href: ROUTES.submission('req-1'),
  },
  {
    id: 'n3',
    title: 'بدأت مراجعة نصك',
    body: '«ظل النخلة» الآن قيد المراجعة لدى اللجنة.',
    time: 'قبل 3 أيام',
    readAt: 'قُرئ قبل يومين',
    requestNo: 'NSP-2026-0002',
    unread: false,
    tone: 'info',
    icon: 'clock',
    href: ROUTES.submission('req-2'),
  },
  {
    id: 'n4',
    title: 'تم تأكيد الدفع',
    body: 'استلمنا رسوم تقديم «ظل النخلة»، والإيصال متاح في حسابك.',
    time: 'قبل 5 أيام',
    readAt: 'قُرئ قبل 4 أيام',
    requestNo: 'NSP-2026-0002',
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
