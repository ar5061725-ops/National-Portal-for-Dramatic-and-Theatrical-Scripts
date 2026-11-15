import type { Metadata } from 'next';
import { getApprovedScripts } from '@/lib/api/scripts';
import { ScriptsBrowser } from '@/features/scripts/ScriptsBrowser';

export const metadata: Metadata = { title: 'النصوص المجازة' };

export default async function ScriptsPage() {
  const scripts = await getApprovedScripts();
  return <ScriptsBrowser scripts={scripts} />;
}
