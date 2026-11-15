import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** عميل Supabase لمكوّنات الخادم، يقرأ جلسة المستخدم من الكوكيز (المفتاح العام فقط، وRLS تحمي البيانات). */
export async function getServerSupabase() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      // في مكوّنات الخادم لا يمكن كتابة الكوكيز؛ تجديد الجلسة يتم في middleware
      setAll: () => {},
    },
  });
}
