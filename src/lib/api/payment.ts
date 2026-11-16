import { PAYMENT_MESSAGES } from '@/config/payment';
import { getSupabase } from '@/lib/supabase/client';
import type { PaymentMethodId } from '@/types';
import { ApiError } from './client';

/**
 * يطلب من دالة Edge (payment-create) فاتورة دفع لطلبك، ثم يحوّلك إلى صفحة الدفع لدى المزوّد.
 * المبلغ لا يأتي من المتصفح: تقرؤه الدالة من قاعدة البيانات. النتيجة النهائية تُؤكَّد عند العودة (ومن الويبهوك).
 */
export async function startPayment(submissionId: string, method: PaymentMethodId): Promise<void> {
  if (method !== 'knet') throw new ApiError('وسيلة الدفع هذه غير مفعّلة بعد', 422);
  if (!submissionId) throw new ApiError(PAYMENT_MESSAGES.failed, 422);

  const { data, error } = await getSupabase().functions.invoke('payment-create', {
    body: { submission_id: submissionId, idempotency_key: crypto.randomUUID() },
  });
  if (error) throw new ApiError('تعذّر إنشاء عملية الدفع، حاول مرة أخرى', 502);

  const result = data as { payment_url?: string; state?: string; error?: string; message?: string } | null;
  if (result?.error === 'fee_not_configured') throw new ApiError('رسوم التقديم غير مضبوطة بعد', 409);
  if (result?.error === 'provider_not_configured') throw new ApiError('إعداد مزوّد الدفع غير مكتمل', 503);
  const url = result?.payment_url;
  if (!url) throw new ApiError(result?.message ?? PAYMENT_MESSAGES.pending, 202);

  // لا نحوّل إلا إلى نطاق المزوّد الموثوق
  const host = new URL(url).host;
  if (new URL(url).protocol !== 'https:' || !/(^|\.)myfatoorah\.com$/.test(host)) throw new ApiError('رابط الدفع غير موثوق', 502);
  window.location.assign(url);
}
