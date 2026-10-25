'use client';

import { MESSAGES } from '@/config/site';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/** التحميل الفعلي يُربط بالخادم لاحقاً؛ حالياً يظهر تنبيه. */
export function DownloadReceiptButton() {
  const { showToast } = useToast();
  return (
    <Button variant="secondary" size="sm" onClick={() => showToast(MESSAGES.receiptDownloaded)}>
      <Icon name="download" size={16} strokeWidth={2} />
      تحميل الإيصال
    </Button>
  );
}
