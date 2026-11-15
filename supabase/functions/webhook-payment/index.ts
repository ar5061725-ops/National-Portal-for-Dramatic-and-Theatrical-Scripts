// وظيفة Edge: webhook-payment (الأوامر 054–056). verify_jwt = false (استدعاء خارجي من المزوّد فقط)،
// وهويته تُثبت بتوقيع المزوّد داخل الكود. تفشل مغلقة: بلا سر أو بتوقيع غير مطابق ترفض الطلب.
//
// تحذير: ترتيب الحقول في buildSignatureString يجب أن يُطابَق مع وثائق MyFatoorah وعيّنة Sandbox لكل نوع حدث (الأمر 055).
// حتى يتم ذلك تُرفض كل الإشعارات (401)، وهو السلوك الآمن.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_BODY_BYTES = 64 * 1024;

/** سلسلة التوقيع: حقول مرتبة بترتيب ثابت بصيغة key=value ومفصولة بفاصلة. عدّلها حسب عقد المزوّد. */
function buildSignatureString(data: Record<string, unknown>): string {
  const pick = (path: string) => path.split('.').reduce<unknown>((obj, k) => (obj as Record<string, unknown> | undefined)?.[k], data);
  const fields = ['Invoice.Id', 'Invoice.Status', 'Transaction.Status', 'Transaction.PaymentMethod', 'Transaction.Id', 'Reference.Id'];
  return fields.map((f) => `${f}=${pick(f) ?? ''}`).join(',');
}

async function hmacBase64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** مقارنة ثابتة الزمن */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });
  const secret = Deno.env.get('MYFATOORAH_WEBHOOK_SECRET');
  if (!secret) return new Response('not_configured', { status: 401 });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new Response('too_large', { status: 413 });

  let payload: { Event?: string; Data?: Record<string, any> };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response('invalid_json', { status: 400 });
  }
  const received = req.headers.get('MyFatoorah-Signature') ?? '';
  const expected = await hmacBase64(secret, buildSignatureString(payload.Data ?? {}));
  if (!received || !safeEqual(received, expected)) return new Response('invalid_signature', { status: 401 });

  const data = payload.Data ?? {};
  const environment = Deno.env.get('PAYMENT_ENV') === 'production' ? 'production' : 'sandbox';
  const status = String(data?.Transaction?.Status ?? data?.Invoice?.Status ?? '').toLowerCase();
  const outcome = status === 'succss' || status === 'success' || status === 'paid' ? 'paid' : status === 'expired' ? 'expired' : 'failed';
  const amountMinor = Math.round(Number(data?.Invoice?.Amount ?? data?.Transaction?.PaidCurrencyValue ?? 0) * 1000);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: result, error } = await admin.rpc('apply_payment_event', {
    p_provider: 'myfatoorah',
    p_environment: environment,
    // مفتاح تكرار مستقر: معرف الحركة + حالتها (حدث مرحلي مختلف لا يضيع)
    p_dedupe_key: `${data?.Transaction?.Id ?? data?.Invoice?.Id ?? 'unknown'}:${status}`,
    p_event_type: payload.Event ?? 'unknown',
    p_merchant_ref: String(data?.Reference?.Id ?? data?.CustomerReference ?? ''),
    p_provider_payment_id: String(data?.Transaction?.Id ?? ''),
    p_amount_minor: amountMinor,
    p_currency: String(data?.Invoice?.Currency ?? 'KWD'),
    p_outcome: outcome,
  });
  // 5xx ليعيد المزوّد الإرسال عند فشل الحفظ؛ 200 بعد الحفظ الدائم فقط
  if (error) return new Response('persist_failed', { status: 500 });
  return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
