import type { Metadata } from 'next';
import { confirmPaymentOnReturn } from '@/lib/payment/confirm';
import { reconcilePendingPayments } from '@/lib/payment/reconcile';
import { getPaidResult, getPayableRequest } from '@/lib/api/requests.server';
import { PaymentFlow } from '@/features/payment/PaymentFlow';

export const metadata: Metadata = { title: 'بوابة الدفع' };
export const dynamic = 'force-dynamic';

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { id } = await params;
  const { paymentId } = await searchParams;

  // العودة من صفحة المزوّد: نؤكد النتيجة من المزوّد نفسه قبل عرض أي حالة
  const returnOutcome = paymentId ? await confirmPaymentOnReturn(id, paymentId) : null;

  // دفعة معلّقة لهذا الطلب؟ نسوّيها من المزوّد قبل العرض (بدل انتظار الويبهوك)
  const pending = await getPayableRequest(id);
  if (pending?.submissionId) await reconcilePendingPayments([pending.submissionId]);

  const [paid, serverSummary] = await Promise.all([getPaidResult(id), getPayableRequest(id)]);
  return <PaymentFlow requestId={id} serverSummary={serverSummary} paid={paid} returnFailed={returnOutcome === 'failed'} />;
}
