import { NextResponse } from 'next/server';
import { getInvoiceStatus } from '@/lib/payment/myfatoorah';
import { isKnownPendingInvoice } from '@/lib/payment/reconcile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Outcome = 'paid' | 'failed' | 'expired';

function toOutcome(status: string): Outcome | null {
  const s = status.toLowerCase();
  if (s === 'paid') return 'paid';
  if (s === 'expired') return 'expired';
  if (s === 'failed' || s === 'canceled' || s === 'cancelled') return 'failed';
  return null; // Pending: لا قرار بعد
}

/** يخزّن الحدث في Supabase عبر apply_payment_event (يتطلب SUPABASE_SERVICE_ROLE_KEY على الخادم فقط). */
async function persist(args: Record<string, unknown>): Promise<'saved' | 'skipped' | 'failed'> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 'skipped';
  const res = await fetch(`${url}/rest/v1/rpc/apply_payment_event`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  return res.ok ? 'saved' : 'failed';
}

/**
 * ويبهوك MyFatoorah. لا نثق بمحتوى الإشعار: نستخرج معرّف الفاتورة منه ثم نسأل المزوّد مباشرة
 * عن الحالة الفعلية (GetPaymentStatus) بمفتاح الخادم، فلا يمكن تزوير "مدفوع" من الخارج.
 * عنوانه لإدخاله في لوحة MyFatoorah: <الموقع>/api/payments/webhook
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 64 * 1024) return NextResponse.json({ error: 'too_large' }, { status: 413 });

  let body: { Event?: string; Data?: Record<string, any> };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const data = body.Data ?? {};
  const invoiceId = data?.Invoice?.Id ?? data?.InvoiceId;
  if (!invoiceId) return NextResponse.json({ error: 'missing_invoice_id' }, { status: 400 });

  // لا نستدعي المزوّد (بمفتاحنا) إلا لفاتورة معلّقة نعرفها؛ يمنع استغلال الويبهوك لاستنزاف حصة الاتصال
  if (!(await isKnownPendingInvoice(String(invoiceId)))) return NextResponse.json({ ignored: true });

  let invoice;
  try {
    invoice = await getInvoiceStatus(invoiceId, 'InvoiceId');
  } catch {
    // 5xx ليعيد المزوّد المحاولة لاحقاً
    return NextResponse.json({ error: 'provider_lookup_failed' }, { status: 502 });
  }

  const outcome = toOutcome(invoice.status);
  if (!outcome) return NextResponse.json({ invoiceId: invoice.invoiceId, status: invoice.status, accepted: false });

  const stored = await persist({
    p_provider: 'myfatoorah',
    p_environment: (process.env.MYFATOORAH_BASE_URL ?? '').includes('apitest') || !process.env.MYFATOORAH_BASE_URL ? 'sandbox' : 'production',
    p_dedupe_key: `${invoice.invoiceId}:${invoice.status.toLowerCase()}`,
    p_event_type: body.Event ?? 'TransactionsStatusChanged',
    p_merchant_ref: invoice.reference ?? '',
    p_provider_payment_id: String(data?.Transaction?.Id ?? ''),
    p_amount_minor: Math.round(invoice.paidAmount * 1000),
    p_currency: invoice.currency,
    p_outcome: outcome,
  });
  if (stored === 'failed') return NextResponse.json({ error: 'persist_failed' }, { status: 500 });

  return NextResponse.json({ invoiceId: invoice.invoiceId, status: invoice.status, accepted: outcome === 'paid', stored });
}
