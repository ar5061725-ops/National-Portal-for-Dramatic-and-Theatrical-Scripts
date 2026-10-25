import type { Metadata } from 'next';
import { getCommitteeOverview } from '@/lib/api/committee';
import { CommitteeReview } from '@/features/committee/CommitteeReview';

export const metadata: Metadata = { title: 'لوحة اللجنة' };

export default async function CommitteePage() {
  const overview = await getCommitteeOverview();
  return <CommitteeReview overview={overview} />;
}
