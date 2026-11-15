import type { Metadata } from 'next';
import { MemoScreen } from '@/features/learning/MemoScreen';

export const metadata: Metadata = { title: 'المذكرة التعليمية: هندسة المسلسل' };

export default function MemoPage() {
  return <MemoScreen />;
}
