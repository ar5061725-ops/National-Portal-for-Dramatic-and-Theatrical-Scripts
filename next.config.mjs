/** مسارات النسخة التجريبية القديمة (انظر src/config/routes.ts › LEGACY_REDIRECTS). */
const legacyRedirects = [
  { source: '/scripts', destination: '/approved' },
  { source: '/scripts/:slug', destination: '/approved/:slug' },
  { source: '/submit', destination: '/submissions/new' },
  { source: '/payment', destination: '/submissions/new' },
  { source: '/requests', destination: '/submissions' },
  { source: '/requests/:id/feedback', destination: '/submissions/:id' },
  { source: '/certificate/:id', destination: '/certificates/:id' },
  { source: '/certificate/:id/print', destination: '/certificates/:id/print' },
  { source: '/profile', destination: '/account' },
  { source: '/terms', destination: '/guide' },
];

/**
 * رؤوس الأمان (OWASP A05). السياسة تسمح بسكربتات الصفحة نفسها (Next يحتاج inline للتهيئة)
 * وبالاتصال بـ Supabase فقط، وتمنع التضمين في إطارات والمحتوى النشط الخارجي.
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // التطوير المحلي يحتاج eval (إعادة التحميل السريع)؛ الإنتاج لا
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return legacyRedirects.map((r) => ({ ...r, permanent: false }));
  },
};

export default nextConfig;
