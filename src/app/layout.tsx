import type { Metadata, Viewport } from 'next';
import { Amiri, IBM_Plex_Sans_Arabic, Reem_Kufi } from 'next/font/google';
import { AppProviders } from '@/providers/AppProviders';
import { SITE } from '@/config/site';
import './globals.css';

const body = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

// خط متغيّر (400–700): خادم Google لم يعد يخدم الأوزان المنفصلة لهذا الخط بصيغة يفهمها next/font
const display = Reem_Kufi({
  subsets: ['arabic', 'latin'],
  variable: '--font-display',
  display: 'swap',
});

const serif = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s | ${SITE.shortName}` },
  description: 'نموذج تجريبي مقدَّم كمقترح إلى معالي وزير الإعلام، ضمن مشروع تخرج معسكر بناء التطبيقات بالذكاء الاصطناعي لدى معهد كودد',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#125A95',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${body.variable} ${display.variable} ${serif.variable}`}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
