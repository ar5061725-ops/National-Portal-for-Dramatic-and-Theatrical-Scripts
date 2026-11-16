import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * بوّابة الدخول لكل الموقع: لا يُتصفَّح شيء قبل تسجيل الدخول، عدا الصفحات الآتية.
 * التحقق من الشهادة (/verify) يبقى عاماً لأن الجهات الخارجية تستخدمه، وواجهات /api تتحقق من الهوية بنفسها.
 */
const PUBLIC_EXACT = new Set(['/', '/login', '/committee/login', '/reset-password']);
const PUBLIC_PREFIXES = ['/verify/', '/auth/'];

const IDENTITY_PATH = '/account/identity';

function isPublic(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function isCommitteePath(pathname: string): boolean {
  return pathname === '/committee' || pathname.startsWith('/committee/');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser يتحقق من الجلسة لدى Supabase (لا يكتفي بقراءة الكوكي)
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const url = request.nextUrl.clone();
    // التسلسل: البداية ← التسجيل/الدخول ← الرئيسية. غير المسجَّل يُعاد إلى صفحة البداية (وللجنة إلى دخولها)
    url.pathname = isCommitteePath(pathname) ? '/committee/login' : '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).is('revoked_at', null);
  const held = new Set((roleRows ?? []).map((r) => r.role as string));
  const isStaff = held.has('reviewer') || held.has('committee_manager');

  if (isCommitteePath(pathname)) {
    const allowed = pathname.startsWith('/committee/decisions') ? held.has('committee_manager') : isStaff;
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/home';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // المؤلف لا يتصفح قبل حفظ بيانات بطاقته المدنية (أعضاء اللجنة معفون)
  if (!isStaff && pathname !== IDENTITY_PATH) {
    const { count } = await supabase.from('author_identity').select('user_id', { count: 'exact', head: true }).eq('user_id', data.user.id);
    if (!count) {
      const url = request.nextUrl.clone();
      url.pathname = IDENTITY_PATH;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // يستثني ملفات Next الثابتة وملفات public المعروفة بأسمائها وواجهات /api (لكل منها تحققها الخاص).
  // لا نستثني «أي مسار فيه نقطة»: مقاطع المسار الديناميكية (مثل /certificates/x.y) كانت ستتجاوز بوابة الدخول.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico$|logo\\.png$|api/).*)'],
};
