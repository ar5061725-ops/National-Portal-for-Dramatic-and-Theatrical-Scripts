import type { Metadata } from 'next';
import { HomeScreen } from '@/features/home/HomeScreen';

export const metadata: Metadata = { title: 'الرئيسية' };

export default function HomePage() {
  return <HomeScreen />;
}
