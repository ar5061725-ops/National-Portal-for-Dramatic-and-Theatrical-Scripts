import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'submissions-portal';
const MAX_BYTES = 20 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * فحص أولي للملفات المرفوعة: التوقيع %PDF- والحجم الفعلي من التخزين (لا مما يدّعيه العميل).
 * يضع النتيجة عبر set_file_scan_status (مخوّلة لـ service_role فقط). لا يغني عن فحص البرمجيات الخبيثة
 * عند الإطلاق، فمكانه عامل فحص مخصص.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { versionId?: string } | null;
  if (!body?.versionId || !UUID.test(body.versionId)) return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });

  // هوية المستخدم من جلسته، ثم نتأكد أن النسخة تخصه عبر RLS قبل استخدام صلاحية الخدمة
  const userClient = await getServerSupabase();
  const { data: auth } = await userClient.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'يلزم تسجيل الدخول' }, { status: 401 });
  const { data: files, error } = await userClient
    .from('submission_files')
    .select('id, object_key, scan_status, version_id')
    .eq('version_id', body.versionId)
    .eq('audience', 'author');
  if (error || !files || files.length === 0) return NextResponse.json({ error: 'لا توجد ملفات لهذه النسخة' }, { status: 404 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'خدمة الفحص غير مهيأة' }, { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let rejected = 0;
  for (const file of files) {
    if (file.scan_status !== 'pending') {
      if (file.scan_status === 'rejected') rejected += 1;
      continue;
    }
    // مفتاح الكائن يجب أن يقع داخل مجلد المؤلف نفسه
    if (!file.object_key.startsWith(`${auth.user.id}/`)) {
      rejected += 1;
      continue;
    }
    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(file.object_key, 60);
    let ok = false;
    if (signed?.signedUrl) {
      const res = await fetch(signed.signedUrl, { headers: { Range: 'bytes=0-7' }, cache: 'no-store' });
      const head = res.ok ? new Uint8Array(await res.arrayBuffer()) : new Uint8Array();
      const total = Number(/\/(\d+)$/.exec(res.headers.get('content-range') ?? '')?.[1] ?? res.headers.get('content-length') ?? 0);
      const isPdf = String.fromCharCode(...head.slice(0, 5)) === '%PDF-';
      ok = isPdf && total > 0 && total <= MAX_BYTES;
    }
    const { error: setError } = await admin.rpc('set_file_scan_status', { p_file_id: file.id, p_status: ok ? 'clean' : 'rejected' });
    if (setError) return NextResponse.json({ error: 'تعذّر حفظ نتيجة الفحص' }, { status: 500 });
    if (!ok) rejected += 1;
  }

  if (rejected > 0) return NextResponse.json({ error: 'أحد الملفات ليس PDF صالحاً أو يتجاوز 20 ميغابايت' }, { status: 422 });
  return NextResponse.json({ ok: true });
}
