import Image from 'next/image';
import { SITE } from '@/config/site';

interface LogoProps {
  size?: number;
  /** حدّ أبيض حول الشعار (فوق خلفية زرقاء) */
  bordered?: boolean;
  priority?: boolean;
}

export function Logo({ size = 44, bordered = true, priority }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={`شعار ${SITE.ministry}`}
      width={size}
      height={size}
      priority={priority}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        border: bordered ? `${size > 100 ? 3 : 2}px solid rgba(255,255,255,0.9)` : undefined,
      }}
    />
  );
}
