import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRequestDetail } from '@/lib/api/requests.server';
import { SubmissionDetail } from '@/features/requests/SubmissionDetail';

export const metadata: Metadata = { title: 'تفاصيل الطلب' };

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getRequestDetail(id);
  if (!thread) notFound();
  return <SubmissionDetail thread={thread} />;
}
