import { ROUTES } from '@/config/routes';
import type { ScriptRequest } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { StatePanel } from '@/components/ui/StatePanel';
import { RequestCard } from './RequestCard';

export function RequestsScreen({ requests }: { requests: ScriptRequest[] }) {
  return (
    <>
      <PageHeader title="طلباتي" subtitle="تابع حالة نصوصك المقدّمة خطوة بخطوة" end={<Logo size={44} />} />
      <PageBody grid>
        <div data-span="full">
          <ButtonLink href={ROUTES.submit} variant="dashed" size="md" block>
            <Icon name="plus" size={18} strokeWidth={2.2} />
            تقديم نص جديد
          </ButtonLink>
        </div>
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
        {requests.length === 0 && (
          <div data-span="full">
            <StatePanel boxed icon="list" title="لا توجد طلبات بعد" description="ابدأ بتقديم نصك الأول وسنعرض حالته هنا." />
          </div>
        )}
      </PageBody>
    </>
  );
}
