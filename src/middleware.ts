import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** صفحات تتطلب تسجيل دخول. الباقي (الرئيسية، المعتمدة، التحقق، الدليل…) مفتوح للزوار. */
const PROTECTED_PREFIXES = ['/submissions', '/payments', '/receipts', '/account', '/notifications', '/certificates', '/committee'];

/** أدوار لوحة اللجنة: المراجع للوحة، والمشرف لشاشة القرار. */
const COMMITTEE_MANAGER_ONLY = '/committee/decisions';

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtected(pathname) || pathname === '/committee/login') return NextResponse.next();
  const loginPath = pathname === '/committee' || pathname.startsWith('/committee/') ? '/committee/login' : '/login';

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
    url.pathname = loginPath;
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (pathname === '/committee' || pathname.startsWith('/committee/')) {
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).is('revoked_at', null);
    const held = new Set((roles ?? []).map((r) => r.role as string));
    const allowed = pathname.startsWith(COMMITTEE_MANAGER_ONLY) ? held.has('committee_manager') : held.has('reviewer') || held.has('committee_manager');
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/home';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/submissions/:path*', '/payments/:path*', '/receipts/:path*', '/account/:path*', '/notifications/:path*', '/certificates/:path*', '/committee/:path*'],
};
