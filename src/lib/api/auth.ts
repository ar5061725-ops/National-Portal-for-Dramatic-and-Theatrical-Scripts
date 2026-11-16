import type { AuthError } from '@supabase/supabase-js';
import { toIdentityPayload } from '@/lib/identity';
import type { IdentityValues } from '@/lib/identity';
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
  identity: IdentityValues;
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
  if (code === 'unexpected_failure' && /database error saving new user/i.test(error.message)) {
    return new ApiError('تعذّر إنشاء الحساب: راجع بيانات البطاقة المدنية، أو أن الرقم المدني مسجَّل بحساب آخر', 422);
  }
  if (error.name === 'AuthRetryableFetchError' || status === 0) return new ApiError(`تعذّر الاتصال بالخادم، تحقق من الإنترنت وأعد المحاولة (${error.message.slice(0, 80)})`, 503);
  if (code === 'email_address_not_authorized') return new ApiError('هذا البريد غير مسموح له بالاستلام بعد؛ فعّل بريد SMTP المخصص للمشروع', 403);
  if (code === 'signup_disabled') return new ApiError('التسجيل معطّل مؤقتاً', 403);
  return new ApiError(`تعذّر إكمال الطلب، حاول مرة أخرى${code ? ` (${code})` : ''}`, status);
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
      // بيانات الهوية تنتقل إلى جدول مغلق عند إنشاء الحساب وتُمسح من بيانات حساب Auth
      data: { full_name: input.name.trim(), phone: input.phone.trim(), ...toIdentityPayload(input.identity) },
      emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
    },
  });
  if (error) throw toApiError(error);
  // بريد مسجَّل ومؤكَّد: يعيد Supabase مستخدماً بلا هويات (لإخفاء وجود الحساب)
  if (data.user && data.user.identities?.length === 0) throw new ApiError('هذا البريد مسجَّل مسبقاً، سجّل الدخول', 409);
}

/** استكمال بيانات الهوية لحساب قائم (مرة واحدة). */
export async function saveMyIdentity(identity: IdentityValues): Promise<void> {
  const { error } = await getSupabase().rpc('save_my_identity', { p: toIdentityPayload(identity) });
  if (!error) return;
  if (error.message.includes('identity_exists')) throw new ApiError('بياناتك محفوظة مسبقاً', 409);
  if (error.message.includes('invalid_civil_id') || error.message.includes('invalid_birth_date')) {
    throw new ApiError('الرقم المدني لا يطابق تاريخ الميلاد؛ راجع البطاقة', 422);
  }
  if (error.code === '23505') throw new ApiError('هذا الرقم المدني مسجَّل بحساب آخر', 409);
  throw new ApiError('تعذّر حفظ البيانات، راجع الحقول وأعد المحاولة', 422);
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
  });
  if (error) throw toApiError(error);
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!EMAIL_PATTERN.test(email.trim())) throw new ApiError('أدخل بريدك الإلكتروني أولاً', 422);
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
  if (error) throw toApiError(error);
}

/** هل توجد جلسة (جلسة الاسترداد من رابط البريد أو جلسة دخول)؟ */
export async function hasSession(): Promise<boolean> {
  const { data } = await getSupabase().auth.getSession();
  return Boolean(data.session);
}

/** تعيين كلمة مرور جديدة للجلسة الحالية (من رابط استعادة كلمة المرور). */
export async function setNewPassword(password: string): Promise<void> {
  if (password.length < 8) throw new ApiError('كلمة المرور يجب ألا تقل عن 8 أحرف', 422);
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw toApiError(error);
}

/** رقم كويتي من 8 أرقام أو دولي بصيغة +…؛ يعيد الصيغة الدولية أو null إن لم يصحّ. */
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s-]/g, '');
  if (/^\d{8}$/.test(compact)) return `+965${compact}`;
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}

export interface ProfileUpdate {
  name: string;
  phone: string;
}

/** تعديل الاسم والهاتف (حقول مسموحة فقط؛ الرقم المدني وبيانات البطاقة لا تُعدَّل من هنا). */
export async function updateMyProfile(input: ProfileUpdate): Promise<void> {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  if (name.length < 2) throw new ApiError('أدخل الاسم الكامل', 422);
  if (!phone) throw new ApiError('رقم الهاتف غير صحيح (8 أرقام كويتية أو بصيغة دولية +…)', 422);

  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new ApiError('انتهت جلستك، سجّل الدخول من جديد', 401);
  const { error: profileError } = await supabase.from('profiles').update({ full_name: name.slice(0, 120), phone_e164: phone }).eq('id', auth.user.id);
  if (profileError) throw new ApiError('تعذّر حفظ البيانات، حاول مرة أخرى', 500);
  const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: name, phone } });
  if (metaError) throw toApiError(metaError);
}

export async function logout(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw toApiError(error);
}
