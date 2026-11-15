import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * عميل Supabase للمتصفح. يستخدم المفتاح العام (publishable) فقط، والحماية الفعلية تأتي من سياسات RLS.
 * لا يُستخدم هنا مفتاح الخدمة السري أبداً.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('إعدادات Supabase غير مضبوطة');
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}
