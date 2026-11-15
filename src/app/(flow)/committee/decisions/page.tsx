import type { Metadata } from 'next';
import { getRoundSummary } from '@/lib/api/committee';
import { RoundDecision } from '@/features/committee/RoundDecision';

export const metadata: Metadata = { title: 'قرار الجولة' };

export default async function CommitteeDecisionsPage() {
  const round = await getRoundSummary();
  return <RoundDecision round={round} />;
}
