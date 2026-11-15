import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getScriptById } from '@/lib/api/scripts';
import { ScriptDetail } from '@/features/scripts/ScriptDetail';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const script = await getScriptById(slug);
  return { title: script?.title ?? 'تفاصيل النص' };
}

export default async function ScriptDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const script = await getScriptById(slug);
  if (!script) notFound();
  return <ScriptDetail script={script} />;
}
