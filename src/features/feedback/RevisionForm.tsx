'use client';

import { useState } from 'react';
import { ROUTES } from '@/config/routes';
import { submitRevision } from '@/lib/api/requests';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PdfFileInput } from '@/components/ui/PdfFileInput';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextArea } from '@/components/ui/TextField';
import { FormError } from '@/components/ui/FormError';
import styles from './RevisionForm.module.css';

/** رد المؤلف على ملاحظات اللجنة ورفع نسخة مستجيبة («إرسال النسخة المعدلة»). */
export function RevisionForm({ requestId }: { requestId: string }) {
  const [reply, setReply] = useState('');
  const [fileName, setFileName] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const submit = useAsyncAction((input: { reply: string; fileName?: string }) => submitRevision(requestId, input));

  if (submit.isSuccess) {
    return (
      <Card padding={20} radius={20}>
        <StatePanel
          tone="info"
          icon="send"
          title="تم إرسال النسخة المعدلة"
          description="عاد نصك إلى مرحلة المراجعة بإصدار جديد مرتبط بردّك على الملاحظات، وسنخبرك فور صدور القرار."
        >
          <ButtonLink href={ROUTES.submissions} size="md" block>
            العودة إلى طلباتي
          </ButtonLink>
        </StatePanel>
      </Card>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void submit.run({ reply, fileName });
      }}
    >
      <Card padding={16} radius={20} gap={12}>
        <TextArea label="ردّك على اللجنة" placeholder="اشرح التعديلات التي أجريتها…" value={reply} onChange={(e) => setReply(e.target.value)} />
        <label className={styles.drop}>
          <Icon name="upload" size={22} strokeWidth={2} />
          <span className={styles.dropText}>
            <span className={styles.dropTitle}>رفع النسخة المعدّلة (PDF)</span>
            <span className={styles.dropStatus}>{fileName ?? 'لم يُرفع ملف بعد'}</span>
          </span>
          <PdfFileInput
            ariaLabel="رفع النسخة المعدّلة"
            onFile={(file) => {
              setFileName(file.name);
              setFileError(undefined);
            }}
            onError={setFileError}
          />
        </label>
        {fileError && (
          <p role="alert" className={styles.error}>
            {fileError}
          </p>
        )}
      </Card>

      <FormError>{submit.isError ? submit.error : undefined}</FormError>

      <Button type="submit" size="xl" elevated block loading={submit.isLoading}>
        إرسال النسخة المعدلة
      </Button>
    </form>
  );
}
