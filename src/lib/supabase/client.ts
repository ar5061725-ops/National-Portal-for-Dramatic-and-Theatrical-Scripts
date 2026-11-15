import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * عميل Supabase للمتصفح. يخزّن الجلسة في كوكيز ليقرأها middleware الخادم ويحمي الصفحات.
 * يستخدم المفتاح العام (publishable) فقط، والحماية الفعلية تأتي من سياسات RLS.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('إعدادات Supabase غير مضبوطة');
  client = createBrowserClient(url, key);
  return client;
}
