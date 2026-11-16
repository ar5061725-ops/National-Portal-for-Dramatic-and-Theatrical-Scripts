import { createClient } from '@supabase/supabase-js';
import { getInvoiceStatus } from './myfatoorah';

/** هل الفاتورة تخص محاولة دفع معلّقة لدينا؟ */
export async function isKnownPendingInvoice(invoiceId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !/^\d{1,20}$/.test(invoiceId)) return false;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await admin.rpc('list_pending_payment_attempts', { p_submission_ids: null, p_limit: 200 });
  return ((data ?? []) as { provider_invoice_id: string }[]).some((r) => r.provider_invoice_id === invoiceId);
}

/**
 * تسوية الدفعات المعلّقة بلا ويبهوك: نسأل MyFatoorah مباشرة (بمفتاح الخادم) عن حالة كل فاتورة معلّقة
 * ثم نثبّتها بـ apply_payment_event (آمن للتكرار: المفتاح والمبلغ تحميهما القاعدة).
 * تُستدعى من مهمة مجدولة، ومن صفحات المؤلف عند فتحها.
 */
export async function reconcilePendingPayments(submissionIds?: string[], limit = 50): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return 0;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: pending, error } = await admin.rpc('list_pending_payment_attempts', {
    p_submission_ids: submissionIds && submissionIds.length > 0 ? submissionIds : null,
    p_limit: limit,
  });
  if (error || !pending || pending.length === 0) return 0;
  if (submissionIds && submissionIds.length === 0) return 0;

  let applied = 0;
  for (const row of pending as { merchant_ref: string; provider_invoice_id: string; environment: string }[]) {
    try {
      const invoice = await getInvoiceStatus(row.provider_invoice_id, 'InvoiceId');
      const status = invoice.status.toLowerCase();
      if (status === 'pending') continue;
      const outcome = status === 'paid' ? 'paid' : status === 'expired' ? 'expired' : 'failed';
      const { error: applyError } = await admin.rpc('apply_payment_event', {
        p_provider: 'myfatoorah',
        p_environment: row.environment,
        p_dedupe_key: `${invoice.invoiceId}:${status}`,
        p_event_type: 'Reconciliation',
        p_merchant_ref: row.merchant_ref,
        p_provider_payment_id: String(invoice.invoiceId),
        p_amount_minor: Math.round(invoice.paidAmount * 1000),
        p_currency: invoice.currency,
        p_outcome: outcome,
      });
      if (!applyError) applied += 1;
    } catch {
      // تعذّر الاتصال بالمزوّد: تُعاد المحاولة في الدورة التالية
    }
  }
  return applied;
}
