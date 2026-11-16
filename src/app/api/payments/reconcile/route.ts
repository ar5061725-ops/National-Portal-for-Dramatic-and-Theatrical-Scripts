import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { reconcilePendingPayments } from '@/lib/payment/reconcile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** مهمة مجدولة (pg_cron ← pg_net) تسوّي الدفعات المعلّقة. تُحمى بسر مشترك CRON_SECRET في الترويسة. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get('x-cron-secret') ?? '';
  const ok = Boolean(secret) && given.length === secret!.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret!));
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const applied = await reconcilePendingPayments(undefined, 50);
  return NextResponse.json({ applied });
}
