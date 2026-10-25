import { AppShell } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { StatePanel } from '@/components/ui/StatePanel';
import { ROUTES } from '@/config/routes';

export default function NotFound() {
  return (
    <AppShell>
      <StatePanel tone="info" icon="searchEmpty" title="الصفحة غير موجودة" description="الرابط الذي تبحث عنه غير متاح أو تم نقله." fill as="h1">
        <ButtonLink href={ROUTES.home} size="md">
          العودة إلى الرئيسية
        </ButtonLink>
      </StatePanel>
    </AppShell>
  );
}
