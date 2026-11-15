import type { AuthError } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';
import { ApiError, wait } from './client';

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  phone: string;
  email: string;
  password: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** يحوّل أخطاء Supabase Auth إلى رسائل عربية مفهومة دون كشف تفاصيل داخلية. */
function toApiError(error: AuthError): ApiError {
  const code = error.code ?? '';
  const status = error.status ?? 500;
  if (code === 'invalid_credentials') return new ApiError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  if (code === 'email_not_confirmed') return new ApiError('لم يُؤكَّد بريدك بعد. افتح رابط التأكيد المرسل إليك ثم سجّل الدخول', 403);
  if (code === 'weak_password') return new ApiError('كلمة المرور ضعيفة؛ استخدم 8 أحرف على الأقل تجمع حروفاً وأرقاماً', 422);
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) {
    return new ApiError('محاولات كثيرة؛ انتظر قليلاً ثم أعد المحاولة', 429);
  }
  if (code === 'user_already_exists' || code === 'email_exists') return new ApiError('هذا البريد مسجَّل مسبقاً، سجّل الدخول', 409);
  return new ApiError('تعذّر إكمال الطلب، حاول مرة أخرى', status);
}

export async function login(input: LoginInput): Promise<void> {
  const email = input.identifier.trim();
  if (!EMAIL_PATTERN.test(email)) throw new ApiError('سجّل الدخول بالبريد الإلكتروني المسجَّل به', 422);
  const { error } = await getSupabase().auth.signInWithPassword({ email, password: input.password });
  if (error) throw toApiError(error);
}

/** الهوية الرقمية (PACI) غير متاحة بعد؛ تُربط لاحقاً بمزوّد هوية معتمد. */
export async function loginWithDigitalId(): Promise<void> {
  await wait(300);
  throw new ApiError('الدخول بالهوية الرقمية غير متاح حالياً', 501);
}

export async function register(input: RegisterInput): Promise<void> {
  const email = input.email.trim();
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password: input.password,
    options: {
      data: { full_name: input.name.trim(), phone: input.phone.trim() },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) throw toApiError(error);
  // بريد مسجَّل ومؤكَّد: يعيد Supabase مستخدماً بلا هويات (لإخفاء وجود الحساب)
  if (data.user && data.user.identities?.length === 0) throw new ApiError('هذا البريد مسجَّل مسبقاً، سجّل الدخول', 409);
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: `${window.location.origin}/login` },
  });
  if (error) throw toApiError(error);
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!EMAIL_PATTERN.test(email.trim())) throw new ApiError('أدخل بريدك الإلكتروني أولاً', 422);
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login` });
  if (error) throw toApiError(error);
}

export async function logout(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw toApiError(error);
}
