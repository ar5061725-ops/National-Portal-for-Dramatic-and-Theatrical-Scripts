import type { Metadata } from 'next';
import { getAssignableSubmissions, getManagerRounds, getReviewers, getRoundSummary } from '@/lib/api/committee.server';
import { RoundDecision } from '@/features/committee/RoundDecision';

export const metadata: Metadata = { title: 'قرارات الجولات' };

export default async function CommitteeDecisionsPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const { round } = await searchParams;
  const [rounds, assignable, reviewers] = await Promise.all([getManagerRounds(), getAssignableSubmissions(), getReviewers()]);
  const selectedId = round ?? rounds.find((r) => r.status === 'awaiting_decision')?.roundId ?? rounds[0]?.roundId;
  const summary = selectedId ? await getRoundSummary(selectedId) : null;
  return <RoundDecision rounds={rounds} summary={summary} assignable={assignable} reviewers={reviewers} />;
}
