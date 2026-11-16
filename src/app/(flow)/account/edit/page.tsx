import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/api/profile';
import { EditProfileForm } from '@/features/profile/EditProfileForm';

export const metadata: Metadata = { title: 'تعديل البيانات' };

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  return <EditProfileForm user={user} />;
}
