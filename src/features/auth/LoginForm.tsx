'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { MESSAGES } from '@/config/site';
import { ROUTES } from '@/config/routes';
import { login, loginWithDigitalId, register, requestPasswordReset, resendConfirmation } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useToast } from '@/providers/ToastProvider';
import { PageBody } from '@/components/layout/PageBody';
import { BackButton, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatePanel } from '@/components/ui/StatePanel';
import { Logo } from '@/components/ui/Logo';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Form } from '@/components/ui/Form';
import { FormError } from '@/components/ui/FormError';
import { TextField } from '@/components/ui/TextField';
import { EMPTY_IDENTITY, validateIdentity } from '@/lib/identity';
import type { IdentityErrors, IdentityValues } from '@/lib/identity';
import { IdentityFields } from './IdentityFields';
import styles from './LoginForm.module.css';

type Mode = 'login' | 'register';
type Errors = Partial<Record<'identifier' | 'password' | 'name' | 'phone' | 'email', string>>;

const COPY: Record<Mode, { heading: string; subheading: string }> = {
  login: { heading: 'مرحباً بعودتك', subheading: 'سجّل دخولك لتقديم نصك الجديد' },
  register: { heading: 'إنشاء حساب جديد', subheading: 'سجّل مرة واحدة ليصبح لك ملف خاص كمؤلف' },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ variant = 'author' }: { variant?: 'author' | 'committee' }) {
  const isCommittee = variant === 'committee';
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>('login');
  const [errors, setErrors] = useState<Errors>({});
  const [values, setValues] = useState({ identifier: '', password: '', name: '', phone: '', email: '' });
  const [identity, setIdentity] = useState<IdentityValues>(EMPTY_IDENTITY);
  const [identityErrors, setIdentityErrors] = useState<IdentityErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [resetLoading, setResetLoading] = useState(false);

  const loginAction = useAsyncAction(login);
  const registerAction = useAsyncAction(register);
  const digitalIdAction = useAsyncAction(loginWithDigitalId);
  const active = mode === 'login' ? loginAction : registerAction;
  const registered = registerAction.isSuccess;
  const succeeded = loginAction.isSuccess || digitalIdAction.isSuccess;
  const busy = loginAction.isLoading || registerAction.isLoading || digitalIdAction.isLoading || succeeded;

  const set = (key: keyof typeof values) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validate(): Errors {
    const next: Errors = {};
    if (mode === 'login') {
      if (!EMAIL_PATTERN.test(values.identifier.trim())) next.identifier = 'أدخل البريد الإلكتروني المسجَّل به';
      if (!values.password) next.password = 'أدخل كلمة المرور';
    } else {
      if (!values.name.trim()) next.name = 'أدخل الاسم الكامل';
      if (!values.phone.trim()) next.phone = 'أدخل رقم الهاتف';
      if (!EMAIL_PATTERN.test(values.email.trim())) next.email = 'أدخل بريداً إلكترونياً صحيحاً';
      if (values.password.length < 8) next.password = 'كلمة المرور يجب ألا تقل عن 8 أحرف';
    }
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    const identityProblems = mode === 'register' ? validateIdentity(identity, confirmed) : {};
    setIdentityErrors(identityProblems);
    if (Object.keys(next).length > 0 || Object.keys(identityProblems).length > 0) return;

    if (mode === 'login') {
      await loginAction.run({ identifier: values.identifier, password: values.password });
    } else {
      await registerAction.run({ name: values.name, phone: values.phone, email: values.email, password: values.password, identity });
    }
  }

  async function runWithToast(action: () => Promise<void>, successMessage: string) {
    try {
      await action();
      showToast(successMessage);
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  }

  /** استعادة كلمة المرور: تأكيد واضح للمستخدم + مهلة 60 ثانية (حد المزوّد) لمنع تكرار الطلب. */
  async function handleForgotPassword() {
    setResetLoading(true);
    try {
      await requestPasswordReset(values.identifier);
      showToast(`إن كان ${values.identifier.trim()} مسجَّلاً فستصلك رسالة بالرابط. تحقق من البريد والرسائل غير المرغوبة.`);
      setResetCooldown(60);
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setResetLoading(false);
    }
  }

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setTimeout(() => setResetCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resetCooldown]);

  // الرابط /login?mode=register (من صفحة البداية) يفتح تبويب التسجيل مباشرة
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!isCommittee && params.get('mode') === 'register') setMode('register');
    if (params.get('reset') === 'done') showToast('تم تغيير كلمة المرور، سجّل الدخول بها');
    if (params.get('confirmed') === '1') showToast('تم تأكيد بريدك الإلكتروني، سجّل الدخول للمتابعة');
    if (params.get('error') === 'link') showToast('الرابط غير صالح أو انتهت صلاحيته، اطلب رابطاً جديداً');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCommittee]);

  // التوجيه بعد النجاح يعتمد على الحالة (الدوال لا تعيد قيمة)
  useEffect(() => {
    if (!succeeded) return;
    // بعد الدخول: الرئيسية دائماً (واللجنة إلى لوحتها)
    router.replace(isCommittee ? ROUTES.committee : ROUTES.home);
    router.refresh();
  }, [succeeded, router, isCommittee]);

  // بعد إنشاء الحساب: يجب تأكيد البريد (رابط يُستخدم مرة واحدة) قبل الدخول
  if (registered) {
    return (
      <>
        <PageHeader rounded start={<BackButton href={ROUTES.splash} />} end={<Logo size={52} />} title="تأكيد البريد الإلكتروني" subtitle="خطوة أخيرة لتفعيل حسابك" />
        <PageBody gap={18}>
          <StatePanel
            tone="success"
            icon="mail"
            title="أرسلنا إليك رابط التأكيد"
            description={`افتح الرابط المرسل إلى ${values.email} من هاتفك أو حاسوبك، ثم ارجع وسجّل الدخول. الرابط يُستخدم مرة واحدة.`}
          >
            <Button variant="outline" size="md" block onClick={() => void runWithToast(() => resendConfirmation(values.email), MESSAGES.confirmationResent)}>
              إعادة إرسال الرابط
            </Button>
            <Button
              size="lg"
              block
              onClick={() => {
                registerAction.reset();
                setMode('login');
              }}
            >
              لدي حساب مؤكَّد، تسجيل الدخول
            </Button>
          </StatePanel>
        </PageBody>
      </>
    );
  }
  const copy = isCommittee
    ? { heading: 'دخول أعضاء لجنة المراجعة', subheading: 'للمراجعين ومشرفي اللجنة فقط، وتُنشأ الحسابات من إدارة اللجنة' }
    : COPY[mode];

  return (
    <>
      <PageHeader
        rounded
        start={<BackButton href={ROUTES.splash} />}
        end={<Logo size={52} />}
        title={copy.heading}
        subtitle={copy.subheading}
      />

      <PageBody gap={18}>
        {!isCommittee && <SegmentedControl
          tone="onLight"
          label="نوع الدخول"
          value={mode}
          onChange={(next) => {
            setMode(next);
            setErrors({});
          }}
          options={[
            { id: 'login', label: 'لدي حساب' },
            { id: 'register', label: 'تسجيل لأول مرة' },
          ]}
        />}

        <Form onSubmit={handleSubmit}>
          {mode === 'login' ? (
            <>
              <TextField
                label="البريد الإلكتروني"
                placeholder="name@example.com"
                autoComplete="username"
                value={values.identifier}
                error={errors.identifier}
                onChange={(e) => set('identifier')(e.target.value)}
              />
              <TextField
                label="كلمة المرور"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={values.password}
                error={errors.password}
                onChange={(e) => set('password')(e.target.value)}
              />
              <button type="button" className={styles.textLink} disabled={resetCooldown > 0 || resetLoading} onClick={() => void handleForgotPassword()}>
                {resetCooldown > 0 ? `أعد الطلب بعد ${resetCooldown} ثانية` : 'نسيت كلمة المرور؟'}
              </button>
            </>
          ) : (
            <>
              <TextField label="الاسم الكامل" placeholder="الاسم كما في البطاقة المدنية" autoComplete="name" value={values.name} error={errors.name} onChange={(e) => set('name')(e.target.value)} />
              <TextField label="رقم الهاتف" type="tel" ltr placeholder="+965" autoComplete="tel" value={values.phone} error={errors.phone} onChange={(e) => set('phone')(e.target.value)} />
              <TextField label="البريد الإلكتروني" type="email" ltr placeholder="name@example.com" autoComplete="email" value={values.email} error={errors.email} onChange={(e) => set('email')(e.target.value)} />
              <TextField label="كلمة المرور" type="password" placeholder="8 أحرف على الأقل" autoComplete="new-password" value={values.password} error={errors.password} onChange={(e) => set('password')(e.target.value)} />
              <IdentityFields
                values={identity}
                errors={identityErrors}
                confirmed={confirmed}
                onChange={(key, value) => {
                  setIdentity((v) => ({ ...v, [key]: value }));
                  setIdentityErrors((e) => ({ ...e, [key]: undefined }));
                }}
                onConfirm={(value) => {
                  setConfirmed(value);
                  setIdentityErrors((e) => ({ ...e, confirmed: undefined }));
                }}
              />
            </>
          )}

          <FormError>{active.isError ? active.error : undefined}</FormError>

          <Button type="submit" size="lg" block loading={active.isLoading} disabled={busy}>
            {mode === 'login' ? 'دخول' : 'إنشاء الحساب والمتابعة'}
          </Button>
        </Form>

        {mode === 'login' && !isCommittee && (
          <>
            <div className={styles.or} aria-hidden="true">
              <span />
              أو
              <span />
            </div>
            <Button variant="outline" size="lg" block loading={digitalIdAction.isLoading} disabled={busy} onClick={() => void digitalIdAction.run()}>
              <Icon name="idCard" size={20} />
              الدخول عبر الهوية الرقمية
            </Button>
            <FormError>{digitalIdAction.isError ? digitalIdAction.error : undefined}</FormError>
          </>
        )}

        {!isCommittee && (
          <Link href={ROUTES.committeeLogin} className={styles.committee}>
            دخول أعضاء لجنة المراجعة
          </Link>
        )}
      </PageBody>
    </>
  );
}
