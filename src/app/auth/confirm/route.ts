import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

/**
 * رابط البريد (تأكيد الحساب أو استعادة كلمة المرور): يتحقق من رمز البريد على الخادم ثم يفتح الصفحة المناسبة.
 * يعمل من أي جهاز (لا يعتمد على المتصفح الذي طُلب منه الرابط)، بعكس تبادل PKCE الافتراضي.
 * القالب في Supabase: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery  (أو type=email للتأكيد)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const fail = () => NextResponse.redirect(new URL('/login?error=link', origin));
  if (!tokenHash || !type || !TYPES.includes(type) || tokenHash.length > 200) return fail();

  const store = await cookies();
  const response = NextResponse.redirect(new URL(type === 'recovery' ? '/reset-password' : '/login?confirmed=1', origin));
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return fail();

  // تأكيد الحساب: ننهي الجلسة التي أنشأها التحقق ليسجّل المستخدم دخوله بنفسه (التسلسل: بداية ← دخول ← رئيسية)
  if (type !== 'recovery') await supabase.auth.signOut();
  return response;
}
