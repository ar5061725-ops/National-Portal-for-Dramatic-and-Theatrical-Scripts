import type { FormHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from './Form.module.css';

/** نموذج بعمود واحد وفراغات موحّدة؛ يُستخدم في كل شاشات الإدخال بدل تكرار أنماط CSS. */
export function Form({ className, noValidate = true, ...rest }: FormHTMLAttributes<HTMLFormElement>) {
  return <form className={cn(styles.form, className)} noValidate={noValidate} {...rest} />;
}
