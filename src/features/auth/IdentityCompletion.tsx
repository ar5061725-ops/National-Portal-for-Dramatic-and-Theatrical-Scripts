'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ROUTES } from '@/config/routes';
import { saveMyIdentity } from '@/lib/api/auth';
import { EMPTY_IDENTITY, validateIdentity } from '@/lib/identity';
import type { IdentityErrors, IdentityValues } from '@/lib/identity';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { PageBody } from '@/components/layout/PageBody';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { IdentityFields } from './IdentityFields';
import styles from './LoginForm.module.css';

/** شاشة إلزامية لمن لم تُحفظ بيانات بطاقته بعد؛ لا يتصفح الموقع قبل إكمالها. */
export function IdentityCompletion() {
  const router = useRouter();
  const [identity, setIdentity] = useState<IdentityValues>(EMPTY_IDENTITY);
  const [errors, setErrors] = useState<IdentityErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  const save = useAsyncAction(saveMyIdentity);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problems = validateIdentity(identity, confirmed);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    await save.run(identity);
  }

  useEffect(() => {
    if (!save.isSuccess) return;
    router.replace(ROUTES.newSubmission);
    router.refresh();
  }, [save.isSuccess, router]);

  return (
    <>
      <PageHeader rounded end={<Logo size={52} />} title="استكمال بيانات الهوية" subtitle="مطلوبة مرة واحدة قبل متابعة استخدام البوابة" />
      <PageBody gap={18}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <IdentityFields
            values={identity}
            errors={errors}
            confirmed={confirmed}
            onChange={(key, value) => {
              setIdentity((v) => ({ ...v, [key]: value }));
              setErrors((e) => ({ ...e, [key]: undefined }));
            }}
            onConfirm={(value) => {
              setConfirmed(value);
              setErrors((e) => ({ ...e, confirmed: undefined }));
            }}
          />
          {save.isError && (
            <p role="alert" className={styles.formError}>
              {save.error}
            </p>
          )}
          <Button type="submit" size="lg" block loading={save.isLoading} disabled={save.isSuccess}>
            حفظ البيانات والمتابعة
          </Button>
        </form>
      </PageBody>
    </>
  );
}
