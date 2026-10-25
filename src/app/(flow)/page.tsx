import type { Metadata } from 'next';
import { SplashScreen } from '@/features/splash/SplashScreen';

export const metadata: Metadata = { title: { absolute: 'البوابة الوطنية للنصوص — شاشة البداية' } };

export default function SplashPage() {
  return <SplashScreen />;
}
