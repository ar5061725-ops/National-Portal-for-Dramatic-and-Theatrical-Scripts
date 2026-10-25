import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFeedbackThread } from '@/lib/api/requests';
import { FeedbackForm } from '@/features/feedback/FeedbackForm';

export const metadata: Metadata = { title: 'ملاحظات اللجنة' };

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getFeedbackThread(id);
  if (!thread) notFound();
  return <FeedbackForm thread={thread} />;
}
