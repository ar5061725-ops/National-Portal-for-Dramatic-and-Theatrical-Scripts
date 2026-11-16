'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ROUTES } from '@/config/routes';
import { updateMyProfile } from '@/lib/api/auth';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useToast } from '@/providers/ToastProvider';
import type { UserAccount } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import { FormError } from '@/components/ui/FormError';
import { Logo } from '@/components/ui/Logo';
import { TextField } from '@/components/ui/TextField';


/** تعديل الاسم والهاتف. البريد والرقم المدني وبيانات البطاقة للقراءة فقط (تعديلها عبر الدعم). */
export function EditProfileForm({ user }: { user: UserAccount }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone === '—' ? '' : user.phone);
  const save = useAsyncAction(updateMyProfile);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await save.run({ name, phone });
  }

  useEffect(() => {
    if (!save.isSuccess) return;
    showToast('تم حفظ بياناتك');
    router.replace(ROUTES.account);
    router.refresh();
  }, [save.isSuccess, router, showToast]);

  return (
    <>
      <PageHeader rounded start={<BackButton href={ROUTES.account} />} end={<Logo size={52} />} title="تعديل البيانات" subtitle="الاسم ورقم الهاتف" />
      <PageBody gap={18}>
        <Form onSubmit={handleSubmit}>
          <TextField label="الاسم الكامل" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="رقم الهاتف" type="tel" ltr autoComplete="tel" placeholder="97900000 أو +965…" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField label="البريد الإلكتروني" ltr value={user.email} readOnly disabled hint="لا يمكن تغييره من هنا" />
          <FormError>{save.isError ? save.error : undefined}</FormError>
          <Button type="submit" size="lg" block loading={save.isLoading} disabled={save.isSuccess}>
            حفظ التعديلات
          </Button>
        </Form>
      </PageBody>
    </>
  );
}
