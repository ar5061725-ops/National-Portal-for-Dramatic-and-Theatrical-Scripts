// وظيفة Edge: payment-create (الأمر 052). verify_jwt = true (مستخدم مسجّل فقط).
// تحذير: عقد MyFatoorah أدناه (المسار وأسماء الحقول) غير مختبَر على Sandbox بعد، وهو شرط الأمر 051.
// لا تنشرها للإنتاج قبل اختبارها بحساب Sandbox الكويتي وتثبيت إصدار API.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cors(origin: string | null) {
  const allowed = Deno.env.get('ALLOWED_ORIGIN') ?? '';
  return {
    'Access-Control-Allow-Origin': origin && origin === allowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  // 1) هوية المستخدم من جلسته (لا من مدخلات الطلب)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthenticated' }, 401, origin);

  // 2) مدخلات محدودة: المبلغ ورابط العودة لا يأتيان من المتصفح أبداً
  let body: { submission_id?: string; idempotency_key?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400, origin);
  }
  if (!body.submission_id || !UUID.test(body.submission_id) || !body.idempotency_key || body.idempotency_key.length < 8 || body.idempotency_key.length > 128) {
    return json({ error: 'invalid_input' }, 400, origin);
  }

  const environment = Deno.env.get('PAYMENT_ENV') === 'production' ? 'production' : 'sandbox';
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 3) حجز المحاولة (أو إعادة الصالحة)؛ الرسم يُقرأ من قاعدة البيانات
  const { data: reserved, error: reserveError } = await admin.rpc('reserve_payment_attempt', {
    p_user_id: userData.user.id,
    p_submission_id: body.submission_id,
    p_idempotency_key: body.idempotency_key,
    p_environment: environment,
  });
  if (reserveError) return json({ error: reserveError.message }, reserveError.code === 'P0002' ? 404 : 409, origin);
  if (reserved.payment_url) return json({ state: reserved.state, payment_url: reserved.payment_url, reused: true }, 200, origin);

  // 4) إنشاء الفاتورة لدى المزوّد بمرجع ثابت. عند انقطاع الرد تبقى المحاولة creating ولا تُنشأ فاتورة بديلة.
  const base = Deno.env.get('MYFATOORAH_BASE_URL') ?? '';
  const expectedHost = environment === 'production' ? 'api.myfatoorah.com' : 'apitest.myfatoorah.com';
  let host = '';
  try {
    host = new URL(base).host;
  } catch {
    return json({ error: 'provider_not_configured' }, 500, origin);
  }
  if (host !== expectedHost) return json({ error: 'provider_host_mismatch' }, 500, origin);

  const siteUrl = Deno.env.get('SITE_URL')!;
  let providerResponse: Response;
  try {
    providerResponse = await fetch(`${base}/v2/SendPayment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('MYFATOORAH_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NotificationOption: 'LNK',
        CustomerName: userData.user.email ?? 'Author',
        InvoiceValue: reserved.amount_minor / 1000, // KWD: ثلاث خانات عشرية
        DisplayCurrencyIso: 'KWD',
        CustomerReference: reserved.merchant_ref,
        CallBackUrl: `${siteUrl}/payments/${reserved.public_no ?? body.submission_id}`,
        ErrorUrl: `${siteUrl}/payments/${reserved.public_no ?? body.submission_id}`,
        Language: 'AR',
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return json({ state: 'verifying', message: 'جارٍ التحقق من الدفع' }, 202, origin);
  }
  const result = await providerResponse.json().catch(() => null);
  if (!providerResponse.ok || !result?.IsSuccess) return json({ state: 'verifying', message: 'جارٍ التحقق من الدفع' }, 202, origin);

  const { data: attached, error: attachError } = await admin.rpc('attach_provider_invoice', {
    p_attempt_id: reserved.attempt_id,
    p_invoice_id: String(result.Data.InvoiceId),
    p_payment_url: result.Data.InvoiceURL,
    p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  if (attachError || attached?.error) return json({ state: 'verifying', message: 'جارٍ التحقق من الدفع' }, 202, origin);
  return json({ state: attached.state, payment_url: attached.payment_url }, 200, origin);
});
