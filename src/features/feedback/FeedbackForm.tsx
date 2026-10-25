'use client';

import { useState } from 'react';
import { ROUTES } from '@/config/routes';
import { submitRevision } from '@/lib/api/requests';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { FeedbackThread } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PdfFileInput } from '@/components/ui/PdfFileInput';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextArea } from '@/components/ui/TextField';
import styles from './FeedbackForm.module.css';

export function FeedbackForm({ thread }: { thread: FeedbackThread }) {
  const [reply, setReply] = useState('');
  const [fileName, setFileName] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const submit = useAsyncAction((input: { reply: string; fileName?: string }) => submitRevision(thread.request.id, input));

  if (submit.isSuccess) {
    return (
      <PageBody>
        <StatePanel
          tone="info"
          icon="send"
          fill
          title="تم إرسال التعديلات"
          description="عاد نصك إلى مرحلة المراجعة، وسنخبرك فور صدور القرار."
        >
          <ButtonLink href={ROUTES.requests} size="md" block>
            العودة إلى طلباتي
          </ButtonLink>
        </StatePanel>
      </PageBody>
    );
  }

  return (
    <>
      <PageHeader
        start={<BackButton href={ROUTES.requests} />}
        end={<Badge tone="warning">مطلوب تعديل</Badge>}
        title="ملاحظات اللجنة"
        titleSize={24}
        subtitle={`${thread.request.title} · ${thread.request.kind}`}
      />

      <PageBody>
        <ol className={styles.notes} aria-label="ملاحظات اللجنة">
          {thread.notes.map((note) => (
            <li key={note.no}>
              <Card padding={14} radius={18}>
                <div className={styles.note}>
                  <span className={styles.noteNo}>{note.no}</span>
                  <div className={styles.noteBody}>
                    <span className={styles.noteWhere}>{note.where}</span>
                    <p className={styles.noteText}>{note.text}</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>

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

          {submit.isError && (
            <p role="alert" className={styles.error}>
              {submit.error}
            </p>
          )}

          <Button type="submit" size="xl" elevated block loading={submit.isLoading}>
            إرسال التعديلات
          </Button>
        </form>
      </PageBody>
    </>
  );
}
