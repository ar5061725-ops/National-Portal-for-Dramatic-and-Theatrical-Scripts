import type { Metadata } from 'next';
import { getProfile } from '@/lib/api/profile';
import { ProfileScreen } from '@/features/profile/ProfileScreen';

export const metadata: Metadata = { title: 'حسابي' };

export default async function ProfilePage() {
  const profile = await getProfile();
  return <ProfileScreen profile={profile} />;
}
