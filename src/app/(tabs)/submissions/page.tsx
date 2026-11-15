import type { Metadata } from 'next';
import { getMyRequests } from '@/lib/api/requests';
import { RequestsScreen } from '@/features/requests/RequestsScreen';

export const metadata: Metadata = { title: 'طلباتي' };

export default async function RequestsPage() {
  const requests = await getMyRequests();
  return <RequestsScreen requests={requests} />;
}
