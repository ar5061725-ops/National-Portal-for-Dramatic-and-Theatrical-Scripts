import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/api/profile';
import { SubmitForm } from '@/features/submit/SubmitForm';

export const metadata: Metadata = { title: 'تقديم نص جديد' };

export default async function SubmitPage() {
  const user = await getCurrentUser();
  return <SubmitForm user={user} />;
}
