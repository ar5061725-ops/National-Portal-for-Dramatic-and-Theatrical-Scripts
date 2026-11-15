'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ROUTES } from '@/config/routes';
import { requestContact } from '@/lib/api/scripts';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextArea } from '@/components/ui/TextField';
import styles from './ContactRequestPanel.module.css';

interface ContactRequestPanelProps {
  scriptId: string;
  authorName: string;
}

/**
 * طلب تواصل من منتج موثّق. بيانات الكاتب (هاتف/بريد) لا تُكشف قبل موافقته:
 * يقرر الكاتب قبول الطلب أو رفضه، والجهة تشرف على المسار.
 */
export function ContactRequestPanel({ scriptId, authorName }: ContactRequestPanelProps) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState('');
  const request = useAsyncAction(requestContact);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await request.run({ scriptId, purpose });
  }

  if (request.isSuccess) {
    return (
      <Card padding={18} radius={20}>
        <StatePanel
          tone="success"
          icon="check"
          title="تم إرسال طلب التواصل"
          description={`سيقرر ${authorName} قبول الطلب أو رفضه. لن تظهر بيانات التواصل إلا بعد موافقته، وستصلك رسالة بالقرار.`}
        />
      </Card>
    );
  }

  return (
    <Card padding={18} radius={20} gap={12}>
      <h2 className={styles.title}>
        <Icon name="mail" size={18} />
        التواصل مع الكاتب
      </h2>
      <p className={styles.note}>
        بيانات الهاتف والبريد محمية. يمكن للمنتج الموثّق إرسال «طلب تواصل» يقرّره الكاتب، تحت إشراف الجهة.
      </p>

      {!open ? (
        <Button size="md" block onClick={() => setOpen(true)}>
          طلب تواصل
        </Button>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextArea
            label="غرض التواصل"
            hint="مثال: أودّ مناقشة إنتاج العمل ضمن موسم رمضان القادم."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
          {request.isError && (
            <p role="alert" className={styles.error}>
              {request.error}
            </p>
          )}
          <div className={styles.actions}>
            <Button type="submit" size="md" loading={request.isLoading}>
              إرسال الطلب
            </Button>
            <Button size="md" variant="outline" onClick={() => setOpen(false)} disabled={request.isLoading}>
              إلغاء
            </Button>
          </div>
        </form>
      )}

      <p className={styles.footnote}>
        الخدمة للمنتجين المعتمدين فقط. <Link href={ROUTES.login}>سجّل الدخول</Link> بحساب منتج موثّق.
      </p>
    </Card>
  );
}
