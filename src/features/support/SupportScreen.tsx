'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ROUTES } from '@/config/routes';
import { HELP_ITEMS, SUPPORT_TOPICS } from '@/content/support';
import { submitSupportTicket } from '@/lib/api/support';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { SupportTopic } from '@/types';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Accordion } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextArea, TextField } from '@/components/ui/TextField';
import { FormError } from '@/components/ui/FormError';
import styles from './SupportScreen.module.css';

const HELP_ACCORDION = HELP_ITEMS.map((h) => ({ id: h.id, title: h.title, content: <p className={styles.answer}>{h.answer}</p> }));

export function SupportScreen() {
  const [topic, setTopic] = useState<SupportTopic>('payment');
  const [requestNo, setRequestNo] = useState('');
  const [message, setMessage] = useState('');
  const ticket = useAsyncAction(submitSupportTicket);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await ticket.run({ topic, requestNo: requestNo.trim(), message });
  }

  return (
    <>
      <PageHeader
        rounded
        start={<BackButton href={ROUTES.account} />}
        end={<Logo size={44} />}
        title="الدعم"
        titleSize={24}
        subtitle="دليل مساعدة سريع، ورفع تذكرة برقم الطلب وبحسب نوعه"
      />

      <PageBody gap={16}>
        <section aria-labelledby="help-heading" className={styles.section}>
          <h2 id="help-heading" className={styles.heading}>
            أسئلة شائعة
          </h2>
          <Accordion items={HELP_ACCORDION} />
        </section>

        {ticket.isSuccess ? (
          <Card padding={20} radius={22}>
            <StatePanel
              tone="success"
              icon="check"
              title="تم رفع التذكرة"
              description={`رقم تذكرتك ${ticket.data?.ticketNo}. سنردّ على بريدك الإلكتروني، واحتفظ بالرقم للمتابعة.`}
            >
              <Button variant="outline" size="md" onClick={() => { ticket.reset(); setMessage(''); }}>
                رفع تذكرة أخرى
              </Button>
            </StatePanel>
          </Card>
        ) : (
          <Card as="section" padding={18} radius={22} gap={14}>
            <h2 className={styles.heading}>رفع تذكرة دعم</h2>
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="support-topic" className={styles.label}>
                  نوع الطلب
                </label>
                <select id="support-topic" className={styles.select} value={topic} onChange={(e) => setTopic(e.target.value as SupportTopic)}>
                  {SUPPORT_TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <TextField
                label="رقم الطلب (اختياري)"
                ltr
                placeholder="NSP-2026-0001"
                value={requestNo}
                onChange={(e) => setRequestNo(e.target.value)}
              />
              <TextArea label="اشرح المشكلة" value={message} onChange={(e) => setMessage(e.target.value)} />
              <FormError>{ticket.isError ? ticket.error : undefined}</FormError>
              <Button type="submit" size="lg" block loading={ticket.isLoading}>
                إرسال التذكرة
              </Button>
            </form>
          </Card>
        )}
      </PageBody>
    </>
  );
}
