/** مسارات المنصة كما وردت في «دليل الشاشات» بوثيقة المشروع. */
export const ROUTES = {
  splash: '/',
  home: '/home',
  approved: '/approved',
  approvedDetail: (slug: string) => `/approved/${slug}`,
  login: '/login',
  newSubmission: '/submissions/new',
  payment: (id: string) => `/payments/${id}`,
  submissions: '/submissions',
  submission: (id: string) => `/submissions/${id}`,
  certificate: (id: string) => `/certificates/${id}`,
  certificatePrint: (id: string) => `/certificates/${id}/print`,
  verify: (code: string) => `/verify/${code}`,
  committee: '/committee',
  committeeDecisions: '/committee/decisions',
  committeeLogin: '/committee/login',
  account: '/account',
  notifications: '/notifications',
  receipts: '/receipts',
  guide: '/guide',
  support: '/support',
} as const;

/** مسارات قديمة (النسخة التجريبية الأولى) تُحوَّل تلقائياً إلى المسارات الجديدة. */
export const LEGACY_REDIRECTS: { source: string; destination: string }[] = [
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
