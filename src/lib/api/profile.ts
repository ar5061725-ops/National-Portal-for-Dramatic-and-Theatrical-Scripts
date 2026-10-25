import type { ProfileData, UserAccount } from '@/types';
import { wait } from './client';
import { getMyRequests } from './requests';

const CURRENT_USER: UserAccount = {
  name: 'عبدالله السالم',
  phone: '+965 5555 1234',
  email: 'a.alsalem@example.com',
  role: 'مؤلف مسجّل',
};

export async function getCurrentUser(): Promise<UserAccount> {
  await wait(150);
  return CURRENT_USER;
}

export async function getProfile(): Promise<ProfileData> {
  const [user, requests] = await Promise.all([getCurrentUser(), getMyRequests()]);
  return {
    user,
    stats: {
      submitted: requests.length,
      approved: requests.filter((r) => r.status === 'approved').length,
      needsRevision: requests.filter((r) => r.status === 'revision').length,
    },
  };
}
