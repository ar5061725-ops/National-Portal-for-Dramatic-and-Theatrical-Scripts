import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';
import styles from './Button.module.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'gold'
  | 'white'
  | 'glass'
  | 'danger'
  | 'dashed'
  | 'warning'
  | 'successSoft';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** يضيف ظل الدعوة للفعل (CTA) */
  elevated?: boolean;
  className?: string;
  children?: ReactNode;
}

function buttonClass({ variant = 'primary', size = 'lg', block, elevated, className }: StyleProps) {
  return cn('pressable', styles.button, styles[variant], styles[size], block && styles.block, elevated && styles.elevated, className);
}

type ButtonProps = StyleProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { loading?: boolean };

export function Button({ variant, size, block, elevated, className, children, loading, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, elevated, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={18} tone="onDark" />}
      {children}
    </button>
  );
}

type ButtonLinkProps = StyleProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & { href: string };

/** رابط بمظهر الزر. يستخدم next/link للروابط الداخلية و<a> لـ tel: و mailto:. */
export function ButtonLink({ variant, size, block, elevated, className, children, href, ...rest }: ButtonLinkProps) {
  const classes = buttonClass({ variant, size, block, elevated, className });
  // روابط خارج نظام التوجيه (اتصال، بريد، ملفات PDF) تُعرض كـ <a> عادية بدون تحميل مسبق
  if (/^(tel|mailto):|\.pdf$/.test(href)) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}
