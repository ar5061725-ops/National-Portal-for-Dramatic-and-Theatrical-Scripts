import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * المذكرة التعليمية للقراءة فقط: لا تُخدم كملف عام، بل لمستخدم مسجَّل فقط من تخزين خاص،
 * وبلا تخزين مؤقت. تُعرض داخل قارئ الصفحة (لوحات canvas) بلا زر تحميل.
 */
export async function GET() {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: signed } = await admin.storage.from('learning-portal').createSignedUrl('series-engineering.pdf', 60);
  if (!signed?.signedUrl) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const upstream = await fetch(signed.signedUrl, { cache: 'no-store' });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
