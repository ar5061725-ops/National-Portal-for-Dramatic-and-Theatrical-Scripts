'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ROUTES } from '@/config/routes';
import { MESSAGES } from '@/config/site';
import { ENABLED_WORK_TYPES, GENRES, LOGLINE_MAX, REQUIRED_FILES, getWorkType } from '@/config/submission';
import { submitNewSubmission } from '@/lib/api/submissions-client';
import { countUploadedFiles, getMissingSteps } from '@/lib/submission';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useSubmission } from '@/providers/SubmissionProvider';
import { useToast } from '@/providers/ToastProvider';
import type { RequiredFileId, UserAccount } from '@/types';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { FormSection } from '@/components/layout/FormSection';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { Stepper } from '@/components/ui/Stepper';
import { TextArea, TextField } from '@/components/ui/TextField';
import { FileRow } from './FileRow';
import { WorkTypePicker } from './WorkTypePicker';
import styles from './SubmitForm.module.css';

const STEPS = ['الحساب', 'بيانات العمل', 'الدفع'];

export function SubmitForm({ user }: { user: UserAccount }) {
  const router = useRouter();
  const { draft, hydrated, patch, setType, toggleGenre, setDetail, setFile, reset } = useSubmission();
  const { showToast } = useToast();
  const [showErrors, setShowErrors] = useState(false);
  // ملفات PDF تبقى في الذاكرة فقط (لا تُحفظ في المتصفح)؛ المسودة المحلية تحفظ أسماءها فقط
  const [fileObjects, setFileObjects] = useState<Partial<Record<RequiredFileId, File>>>({});
  const submit = useAsyncAction(submitNewSubmission);
  const [fileErrors, setFileErrors] = useState<Partial<Record<RequiredFileId, string>>>({});

  // مسودة محفوظة بنوع عمل غير مفعّل في النسخة الحالية (مثل الفيلم) تعود لأول نوع مفعّل
  useEffect(() => {
    if (hydrated && !ENABLED_WORK_TYPES.some((t) => t.id === draft.type)) setType(ENABLED_WORK_TYPES[0].id);
  }, [hydrated, draft.type, setType]);

  if (!hydrated) return <PageSkeleton />;

  const name = draft.name ?? user.name;
  const phone = draft.phone ?? user.phone;
  const email = draft.email ?? user.email;
  const workType = getWorkType(draft.type);
  const missing = getMissingSteps(draft);
  const uploaded = countUploadedFiles(draft);

  function saveDraft() {
    patch({ savedAt: new Date().toISOString() });
    showToast(MESSAGES.draftSaved);
  }

  /** إرسال الطلب إلى Supabase: رفع الملفات وفحصها وقفل النسخة، ثم الدفع إن كان مفعّلاً أو قائمة الطلبات. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (missing.length > 0) {
      setShowErrors(true);
      return;
    }
    const result = await submit.run({
      draft,
      files: fileObjects,
      versionId: draft.versionId,
      onVersion: (versionId) => patch({ versionId }),
    });
    if (!result) return;
    reset();
    if (result.status === 'awaiting_payment') {
      router.push(ROUTES.payment(result.publicNo));
    } else {
      showToast(`تم استلام طلبك ${result.publicNo}`);
      router.push(ROUTES.submissions);
      router.refresh();
    }
  }

  const savedLabel = draft.savedAt
    ? `آخر حفظ: ${new Date(draft.savedAt).toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' })}`
    : 'تُحفظ بياناتك تلقائياً في هذا الجهاز';

  return (
    <>
      <PageHeader rounded start={<BackButton href={ROUTES.submissions} />} barTitle="تقديم نص جديد" end={<Logo size={44} />}>
        <Stepper steps={STEPS} current={1} />
      </PageHeader>

      <PageBody>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Card padding={18} gap={14}>
            <div className={styles.welcome}>
              <span className={styles.initial} aria-hidden="true">
                {name.charAt(0)}
              </span>
              <div className={styles.welcomeText}>
                <p className={styles.welcomeTitle}>أهلاً بك، {name.split(' ')[0] || name}</p>
                <p className={styles.welcomeHint}>املأ الخطوات التالية لتقديم نصك للمراجعة</p>
              </div>
            </div>
          </Card>

          <FormSection number={1} title="بيانات المؤلف">
            <TextField label="الاسم" autoComplete="name" value={name} onChange={(e) => patch({ name: e.target.value })} />
            <TextField label="رقم الهاتف" type="tel" ltr autoComplete="tel" value={phone} onChange={(e) => patch({ phone: e.target.value })} />
            <TextField label="البريد الإلكتروني" type="email" ltr autoComplete="email" value={email} onChange={(e) => patch({ email: e.target.value })} />
          </FormSection>

          <FormSection number={2} title="العمل">
            <TextField
              label="عنوان العمل"
              placeholder="اكتب اسم النص"
              value={draft.title}
              error={showErrors && !draft.title.trim() ? 'عنوان العمل مطلوب' : undefined}
              onChange={(e) => patch({ title: e.target.value })}
            />
            <p className={styles.groupLabel}>نوع العمل</p>
            <WorkTypePicker value={draft.type} onChange={setType} />

            <div className={styles.genreHead}>
              <span className={styles.groupLabel}>التصنيف</span>
              <span className={styles.hint}>يمكنك اختيار أكثر من تصنيف</span>
            </div>
            <div className={styles.genres} role="group" aria-label="التصنيف">
              {GENRES.map((genre) => (
                <Chip key={genre.id} pressed={draft.genres.includes(genre.id)} onClick={() => toggleGenre(genre.id)}>
                  {genre.label}
                </Chip>
              ))}
            </div>
          </FormSection>

          <FormSection number={3} title={workType.detailsTitle}>
            <div className={styles.twoCols}>
              {workType.fields.map((field) => {
                const key = `${workType.id}.${field.id}`;
                return (
                  <TextField
                    key={key}
                    label={field.label}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder={field.placeholder}
                    value={draft.details[key] ?? ''}
                    onChange={(e) => setDetail(key, e.target.value)}
                  />
                );
              })}
            </div>
          </FormSection>

          <FormSection number={4} title="اللوجلاين">
            <TextArea
              label="جملة أو جملتان تلخّصان فكرة العمل: البطل، هدفه، وما يقف في طريقه"
              maxLength={LOGLINE_MAX}
              placeholder="مثال: بعد رحيل الجد، يكتشف أبناؤه وصية تكشف سراً عمره ثلاثون عاماً…"
              value={draft.logline}
              error={showErrors && !draft.logline.trim() ? 'اللوجلاين مطلوب' : undefined}
              onChange={(e) => patch({ logline: e.target.value })}
            />
            <p dir="ltr" className={styles.counter}>
              {draft.logline.length} / {LOGLINE_MAX}
            </p>
          </FormSection>

          <FormSection number={5} title="المرفقات (PDF)" aside={<span className={styles.uploadedCount}>{uploaded} من {REQUIRED_FILES.length}</span>}>
            <div className={styles.workNo}>
              <TextField
                label="رقم المصنف لدى المكتبة الوطنية"
                hint="رقم إيداع المصنف الذي يثبت حق ملكيتك الفكرية للنص"
                ltr
                placeholder="مثال: 2026/1234"
                value={draft.workNo}
                onChange={(e) => patch({ workNo: e.target.value })}
              />
            </div>
            {REQUIRED_FILES.map((file) => (
              <FileRow
                key={file.id}
                label={file.label}
                fileName={draft.files[file.id]}
                highlightMissing={showErrors}
                error={fileErrors[file.id]}
                onFile={(f) => {
                  setFile(file.id, f.name);
                  setFileObjects((all) => ({ ...all, [file.id]: f }));
                  setFileErrors((e) => ({ ...e, [file.id]: undefined }));
                }}
                onError={(message) => setFileErrors((e) => ({ ...e, [file.id]: message }))}
              />
            ))}
          </FormSection>

          {showErrors && missing.length > 0 && (
            <div role="alert" className={styles.alert}>
              <p className={styles.alertTitle}>
                <Icon name="alert" size={20} strokeWidth={2} />
                بقيت خطوات قبل الإكمال
              </p>
              <ul>
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {submit.isError && (
            <div role="alert" className={styles.alert}>
              <p className={styles.alertTitle}>
                <Icon name="alert" size={20} strokeWidth={2} />
                {submit.error}
              </p>
            </div>
          )}

          <Button type="submit" size="xl" elevated block loading={submit.isLoading}>
            إرسال الطلب
            <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
          </Button>
          <Button variant="outline" size="lg" block onClick={saveDraft}>
            <Icon name="fileCheck" size={20} />
            حفظ المسودة
          </Button>
          <p className={styles.saved} aria-live="polite">
            {savedLabel}
          </p>
          <p className={styles.legal}>بالضغط على إكمال، تقرّ بأن النص من تأليفك وأن البيانات المدخلة صحيحة</p>
        </form>
      </PageBody>
    </>
  );
}
