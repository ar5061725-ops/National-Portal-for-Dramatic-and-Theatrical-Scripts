import type { ProfileData, UserAccount } from '@/types';
import { getServerSupabase } from '@/lib/supabase/server';
import { ApiError } from './client';
import { getMyRequests } from './requests';

const ROLE_LABELS: Record<string, string> = {
  committee_manager: 'مشرف اللجنة',
  reviewer: 'عضو لجنة المراجعة',
  author: 'مؤلف مسجّل',
};

/** المستخدم الحالي من جلسة Supabase الفعلية (الاسم من profiles، والبريد والهاتف من الحساب). */
export async function getCurrentUser(): Promise<UserAccount> {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new ApiError('يلزم تسجيل الدخول', 401);

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id).is('revoked_at', null),
  ]);
  const held = (roles ?? []).map((r) => r.role as string);
  const top = ['committee_manager', 'reviewer', 'author'].find((r) => held.includes(r)) ?? 'author';

  return {
    name: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'مستخدم',
    phone: (user.user_metadata?.phone as string | undefined) ?? '—',
    email: user.email ?? '',
    role: ROLE_LABELS[top],
  };
}

export async function getProfile(): Promise<ProfileData> {
  const [user, requests] = await Promise.all([getCurrentUser(), getMyRequests()]);
  return {
    user,
    stats: {
      submitted: requests.filter((r) => r.status !== 'draft').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      needsRevision: requests.filter((r) => r.status === 'revision').length,
    },
  };
}
