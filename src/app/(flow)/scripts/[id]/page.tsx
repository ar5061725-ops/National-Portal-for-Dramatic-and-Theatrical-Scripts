import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getScriptById } from '@/lib/api/scripts';
import { ScriptDetail } from '@/features/scripts/ScriptDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const script = await getScriptById(id);
  return { title: script?.title ?? 'تفاصيل النص' };
}

export default async function ScriptDetailPage({ params }: PageProps) {
  const { id } = await params;
  const script = await getScriptById(id);
  if (!script) notFound();
  return <ScriptDetail script={script} />;
}
