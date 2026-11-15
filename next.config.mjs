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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return legacyRedirects.map((r) => ({ ...r, permanent: false }));
  },
};

export default nextConfig;
