import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/api/profile';
import { MemoViewer } from '@/features/learning/MemoViewer';

export const metadata: Metadata = { title: 'قراءة المذكرة', robots: { index: false, follow: false } };

export default async function MemoReadPage() {
  const user = await getCurrentUser();
  return <MemoViewer watermark={user.email} />;
}
