import type { PaymentMethodId, SubmissionDraft } from '@/types';
import { ApiError, wait } from './client';

export interface PaymentResult {
  orderNo: string;
}

export async function payForSubmission(
  method: PaymentMethodId,
  draft: Pick<SubmissionDraft, 'title'>,
): Promise<PaymentResult> {
  await wait(1600);
  if (!method) throw new ApiError('اختر طريقة الدفع', 422);
  if (!draft.title.trim()) throw new ApiError('لا يوجد طلب لإكماله', 422);
  const serial = String(Date.now()).slice(-4);
  return { orderNo: `NSP-${new Date().getFullYear()}-${serial}` };
}
