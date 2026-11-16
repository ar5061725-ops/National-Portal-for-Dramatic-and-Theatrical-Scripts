'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ROUTES } from '@/config/routes';
import { hasSession, logout, setNewPassword } from '@/lib/api/auth';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { PageBody } from '@/components/layout/PageBody';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextField } from '@/components/ui/TextField';
import styles from './LoginForm.module.css';

type LinkState = 'checking' | 'valid' | 'invalid';

/** الصفحة التي يفتحها رابط «نسيت كلمة المرور» في البريد: يتبادل Supabase الرمز على المتصفح ثم نعيّن كلمة المرور. */
export function ResetPasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<LinkState>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const save = useAsyncAction(setNewPassword);

  useEffect(() => {
    let cancelled = false;
    // الرمز في الرابط يُستبدل بجلسة تلقائياً؛ ننتظر لحظة ثم نتحقق
    const check = async (tries: number) => {
      if (await hasSession()) {
        if (!cancelled) setState('valid');
      } else if (tries > 0) {
        setTimeout(() => void check(tries - 1), 400);
      } else if (!cancelled) {
        setState('invalid');
      }
    };
    void check(6);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!save.isSuccess) return;
    // نُنهي الجلسة ليسجّل المستخدم الدخول بكلمته الجديدة
    void logout().finally(() => router.replace(`${ROUTES.login}?reset=done`));
  }, [save.isSuccess, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setError('كلمة المرور يجب ألا تقل عن 8 أحرف');
    if (password !== confirm) return setError('كلمتا المرور غير متطابقتين');
    setError(undefined);
    await save.run(password);
  }

  return (
    <>
      <PageHeader rounded end={<Logo size={52} />} title="تعيين كلمة مرور جديدة" subtitle="اختر كلمة مرور قوية لا تقل عن 8 أحرف" />
      <PageBody gap={18}>
        {state === 'checking' && <StatePanel tone="loading" fill title="جارٍ التحقق من الرابط" />}
        {state === 'invalid' && (
          <StatePanel tone="info" icon="alert" title="الرابط غير صالح أو انتهت صلاحيته" description="اطلب رابطاً جديداً من صفحة تسجيل الدخول عبر «نسيت كلمة المرور؟». يُستخدم كل رابط مرة واحدة.">
            <ButtonLink href={ROUTES.login} size="lg" block>
              العودة إلى تسجيل الدخول
            </ButtonLink>
          </StatePanel>
        )}
        {state === 'valid' && (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <TextField label="كلمة المرور الجديدة" type="password" autoComplete="new-password" placeholder="8 أحرف على الأقل" value={password} onChange={(e) => setPassword(e.target.value)} />
            <TextField label="تأكيد كلمة المرور" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {(error || save.isError) && (
              <p role="alert" className={styles.formError}>
                {error ?? save.error}
              </p>
            )}
            <Button type="submit" size="lg" block loading={save.isLoading} disabled={save.isSuccess}>
              حفظ كلمة المرور
            </Button>
          </form>
        )}
      </PageBody>
    </>
  );
}
