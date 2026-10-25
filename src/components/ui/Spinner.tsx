import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: number;
  tone?: 'primary' | 'onDark';
}

export function Spinner({ size = 24, tone = 'primary' }: SpinnerProps) {
  return (
    <span
      className={`${styles.spinner} ${tone === 'onDark' ? styles.onDark : ''}`}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 12)) }}
      aria-hidden="true"
    />
  );
}
