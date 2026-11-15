import { PAYMENT_MESSAGES } from '@/config/payment';
import type { PaymentMethodId } from '@/types';
import { ApiError, wait } from './client';

export interface PaymentResult {
  orderNo: string;
}

/**
 * ينشئ محاولة دفع (مبلغها من قاعدة البيانات لا من المتصفح) ثم ينتظر تأكيد المزوّد.
 * في النسخة الحقيقية: Edge Function (payment-create) ثم Webhook موقّع.
 */
export async function payForSubmission(requestNo: string, method: PaymentMethodId): Promise<PaymentResult> {
  await wait(1600);
  if (method !== 'knet') throw new ApiError('وسيلة الدفع هذه غير مفعّلة بعد', 422);
  if (!requestNo) throw new ApiError(PAYMENT_MESSAGES.failed, 422);
  return { orderNo: requestNo };
}
