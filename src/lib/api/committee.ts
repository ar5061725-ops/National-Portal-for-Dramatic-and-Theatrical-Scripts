import type { CommitteeDecisionInput, CommitteeOverview } from '@/types';
import { ApiError, wait } from './client';

const OVERVIEW: CommitteeOverview = {
  stats: { pending: 2, revised: 1, decided: 2 },
  queue: [
    { id: 'a', title: 'ظل النخلة', meta: 'مسلسل درامي · 15 حلقة · فهد العنزي' },
    { id: 'b', title: 'رسائل من الماضي', meta: 'فيلم سينمائي · نسخة معدّلة' },
  ],
};

export async function getCommitteeOverview(): Promise<CommitteeOverview> {
  await wait();
  return OVERVIEW;
}

export async function submitDecision(input: CommitteeDecisionInput): Promise<void> {
  await wait(700);
  if (input.score < 1 || input.score > 10) throw new ApiError('الدرجة يجب أن تكون بين 1 و 10', 422);
}
