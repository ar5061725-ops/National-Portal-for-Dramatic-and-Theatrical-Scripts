import type { CommitteeDecisionInput, CommitteeOverview } from '@/types';
import { ApiError, wait } from './client';

/** نسخ منزوعة الهوية: يظهر للمراجع رمز الطلب ونوع العمل فقط. */
const OVERVIEW: CommitteeOverview = {
  stats: { pending: 2, revised: 1, decided: 2 },
  queue: [
    { id: 'a', code: 'NSP-2026-0002', meta: 'مسلسل درامي · 15 حلقة' },
    { id: 'b', code: 'NSP-2026-0003', meta: 'مسلسل درامي · نسخة معدّلة' },
  ],
};

export async function getCommitteeOverview(): Promise<CommitteeOverview> {
  await wait();
  return OVERVIEW;
}

/** إعلان تعارض المصالح؛ يُسحب التعيين وتُعاد الإحالة لمراجع آخر. */
export async function declareConflict(itemId: string): Promise<void> {
  await wait(600);
  if (!OVERVIEW.queue.some((q) => q.id === itemId)) throw new ApiError('التعيين غير موجود', 404);
}

export async function submitDecision(input: CommitteeDecisionInput): Promise<void> {
  await wait(700);
  if (input.score < 1 || input.score > 10) throw new ApiError('الدرجة يجب أن تكون بين 1 و 10', 422);
  if (!input.reason.trim()) throw new ApiError('اكتب سبب القرار؛ القرارات يجب أن تكون مسبَّبة', 422);
}
