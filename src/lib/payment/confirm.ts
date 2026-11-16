import { createClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase/server';
import { getInvoiceStatus } from './myfatoorah';

export type ConfirmOutcome = 'paid' | 'failed' | 'pending' | 'ignored';

/**
 * يؤكد الدفع عند عودة المستخدم من صفحة المزوّد (?paymentId=...). لا نثق بالرابط: نسأل MyFatoorah مباشرة
 * عن حالة الدفعة بمفتاح الخادم، ونتأكد أن مرجعها يخص طلباً يملكه هذا المستخدم، ثم نثبّتها بـ apply_payment_event
 * (التكرار والمبلغ تحميهما القاعدة؛ والويبهوك يصل للنتيجة نفسها بلا أثر مضاعف).
 */
export async function confirmPaymentOnReturn(publicNo: string, paymentId: string): Promise<ConfirmOutcome> {
  if (!/^[A-Za-z0-9-]{4,64}$/.test(paymentId) || !/^NSP-[A-Z0-9]+$/.test(publicNo)) return 'ignored';

  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 'ignored';
  const { data: own } = await supabase.from('submissions').select('id').eq('public_no', publicNo).eq('author_id', auth.user.id).maybeSingle();
  if (!own) return 'ignored';

  let invoice;
  try {
    invoice = await getInvoiceStatus(paymentId, 'PaymentId');
  } catch {
    return 'pending';
  }
  if (!invoice.reference || !invoice.reference.startsWith(`${publicNo}-`)) return 'ignored';

  const status = invoice.status.toLowerCase();
  const outcome = status === 'paid' ? 'paid' : status === 'expired' ? 'expired' : status === 'pending' ? null : 'failed';
  if (!outcome) return 'pending';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return 'pending';
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const environment = (process.env.MYFATOORAH_BASE_URL ?? '').includes('apitest') || !process.env.MYFATOORAH_BASE_URL ? 'sandbox' : 'production';
  const { error } = await admin.rpc('apply_payment_event', {
    p_provider: 'myfatoorah',
    p_environment: environment,
    p_dedupe_key: `${invoice.invoiceId}:${status}`,
    p_event_type: 'ReturnConfirmation',
    p_merchant_ref: invoice.reference,
    p_provider_payment_id: paymentId,
    p_amount_minor: Math.round(invoice.paidAmount * 1000),
    p_currency: invoice.currency,
    p_outcome: outcome,
  });
  if (error) return 'pending';
  return outcome === 'paid' ? 'paid' : 'failed';
}
