-- الدفعة 05 (الأوامر 041–050): الرسوم، الاستحقاق، محاولات الدفع، الأحداث، الاسترداد، الإيصالات، التسوية.
-- كل جداول الدفع في app_private (لا وصول مباشر من واجهة البيانات)؛ المؤلف يقرأ عبر دوال محدودة.

create extension if not exists btree_gist with schema extensions;

-- ───────── 041: fee_rules (المبلغ بالفلس، KWD ثابتة) ─────────
create table app_private.fee_rules (
  id uuid primary key default gen_random_uuid(),
  service_code text not null check (service_code ~ '^[a-z_]+$'),
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'KWD' check (currency = 'KWD'),
  effective_at timestamptz not null,
  ends_at timestamptz,
  approved_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > effective_at),
  -- لا تداخل لفترات نفاذ الرسم نفسه
  constraint fee_rules_no_overlap exclude using gist (service_code with =, tstzrange(effective_at, ends_at) with &&)
);

-- ───────── 042: payment_obligations و payment_attempts ─────────
create table app_private.payment_obligations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id),
  cycle int not null default 1,
  service_code text not null,
  fee_rule_id uuid not null references app_private.fee_rules (id),
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'KWD' check (currency = 'KWD'),
  created_at timestamptz not null default now(),
  unique (submission_id, cycle)
);

create table app_private.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references app_private.payment_obligations (id),
  submission_id uuid not null references public.submissions (id),
  fee_rule_id uuid not null references app_private.fee_rules (id),
  provider text not null default 'myfatoorah',
  environment app_private.provider_env not null,
  merchant_ref text not null,
  provider_invoice_id text,
  provider_payment_id text,
  payment_url text check (payment_url is null or payment_url ~ '^https://[a-z0-9.-]+\.myfatoorah\.com/'),
  state app_private.payment_state not null default 'creating',
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'KWD' check (currency = 'KWD'),
  expires_at timestamptz,
  next_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, environment, merchant_ref)
);
create trigger payment_attempts_touch before update on app_private.payment_attempts
  for each row execute function app_private.touch_updated_at();
-- محاولة نشطة واحدة، وتحصيل معتمد واحد لكل استحقاق
create unique index payment_attempts_one_active on app_private.payment_attempts (obligation_id) where state in ('creating', 'pending');
create unique index payment_attempts_one_collected on app_private.payment_attempts (obligation_id) where state in ('paid', 'partially_refunded', 'refunded');
create unique index payment_attempts_invoice on app_private.payment_attempts (provider, environment, provider_invoice_id) where provider_invoice_id is not null;
create index payment_attempts_to_check on app_private.payment_attempts (next_check_at) where state in ('creating', 'pending');

-- ───────── 043: payment_events (تكرار الإشعار يُسجَّل مرة) ─────────
create table app_private.payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  environment app_private.provider_env not null,
  dedupe_key text not null,
  event_type text not null,
  payment_attempt_id uuid references app_private.payment_attempts (id),
  payload_min jsonb not null default '{}'::jsonb,
  process_state app_private.event_process_state not null default 'received',
  attempts int not null default 0,
  next_attempt_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, environment, dedupe_key)
);

-- ───────── 044: refunds ─────────
create table app_private.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid not null references app_private.payment_attempts (id),
  provider_refund_id text,
  merchant_refund_ref text not null unique default ('RF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  amount_minor bigint not null check (amount_minor > 0),
  state app_private.refund_state not null default 'requested',
  requested_by uuid not null references auth.users (id),
  approved_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (approved_by is null or approved_by <> requested_by)   -- فصل الطالب عن المعتمد
);

-- ───────── 045: receipts و payment_reconciliations ─────────
create table app_private.receipts (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid not null unique references app_private.payment_attempts (id),  -- إيصال واحد لكل تحصيل
  receipt_no text not null unique,
  issued_at timestamptz not null default now(),
  object_key text
);
create sequence app_private.receipt_seq start 1;

create table app_private.payment_reconciliations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references app_private.payment_attempts (id),
  reason_code text not null,
  details_min jsonb not null default '{}'::jsonb,
  state app_private.reconciliation_state not null default 'open',
  resolved_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger payment_reconciliations_touch before update on app_private.payment_reconciliations
  for each row execute function app_private.touch_updated_at();

alter table app_private.fee_rules enable row level security;
alter table app_private.payment_obligations enable row level security;
alter table app_private.payment_attempts enable row level security;
alter table app_private.payment_events enable row level security;
alter table app_private.refunds enable row level security;
alter table app_private.receipts enable row level security;
alter table app_private.payment_reconciliations enable row level security;

-- ───────── مساعد: الرسم النافذ ─────────
create function app_private.current_fee(p_service text) returns app_private.fee_rules
language sql stable security definer set search_path = '' as $$
  select r from app_private.fee_rules r
  where r.service_code = p_service and r.effective_at <= now() and (r.ends_at is null or r.ends_at > now())
  order by r.effective_at desc limit 1;
$$;

-- ───────── 046: حجز محاولة دفع (لخدمة الدفع فقط، بعد تحقق الجلسة في Edge) ─────────
create function public.reserve_payment_attempt(p_user_id uuid, p_submission_id uuid, p_idempotency_key text, p_environment app_private.provider_env)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_sub public.submissions;
  v_fee app_private.fee_rules;
  v_ob app_private.payment_obligations;
  v_att app_private.payment_attempts;
  v_reused boolean := false;
begin
  perform app_private.idem_lock(p_user_id, 'reserve_payment', p_idempotency_key);
  select * into v_sub from public.submissions where id = p_submission_id for update;
  if not found or v_sub.author_id <> p_user_id then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_sub.status <> 'awaiting_payment' then raise exception 'not_awaiting_payment' using errcode = '55000'; end if;

  v_fee := app_private.current_fee('submission');
  if v_fee.id is null then raise exception 'fee_not_configured' using errcode = '55000'; end if;

  -- الاستحقاق: ثابت على نسخة الرسم وقت إنشائه
  insert into app_private.payment_obligations (submission_id, service_code, fee_rule_id, amount_minor, currency)
  values (p_submission_id, 'submission', v_fee.id, v_fee.amount_minor, v_fee.currency)
  on conflict (submission_id, cycle) do nothing;
  select * into v_ob from app_private.payment_obligations where submission_id = p_submission_id and cycle = 1;

  if exists (select 1 from app_private.payment_attempts a where a.obligation_id = v_ob.id and a.state in ('paid', 'partially_refunded', 'refunded')) then
    raise exception 'already_paid' using errcode = '55000';
  end if;

  select * into v_att from app_private.payment_attempts a where a.obligation_id = v_ob.id and a.state in ('creating', 'pending');
  if found then
    v_reused := true;
  else
    insert into app_private.payment_attempts (obligation_id, submission_id, fee_rule_id, environment, merchant_ref, amount_minor, currency, next_check_at)
    values (v_ob.id, p_submission_id, v_ob.fee_rule_id, p_environment,
            v_sub.public_no || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
            v_ob.amount_minor, v_ob.currency, now() + interval '10 minutes')
    returning * into v_att;
  end if;

  return jsonb_build_object('attempt_id', v_att.id, 'merchant_ref', v_att.merchant_ref, 'amount_minor', v_att.amount_minor,
                            'currency', v_att.currency, 'state', v_att.state, 'payment_url', v_att.payment_url, 'reused', v_reused);
end $$;

-- ───────── 047: ربط فاتورة المزوّد ─────────
create function public.attach_provider_invoice(p_attempt_id uuid, p_invoice_id text, p_payment_url text, p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_att app_private.payment_attempts;
begin
  select * into v_att from app_private.payment_attempts where id = p_attempt_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_att.provider_invoice_id is not null then
    -- إعادة النتيجة نفسها آمنة؛ فاتورة مختلفة تُحجر في التسوية
    if v_att.provider_invoice_id = p_invoice_id then
      return jsonb_build_object('attempt_id', v_att.id, 'state', v_att.state, 'payment_url', v_att.payment_url);
    end if;
    insert into app_private.payment_reconciliations (attempt_id, reason_code, details_min)
    values (v_att.id, 'invoice_mismatch', jsonb_build_object('existing', v_att.provider_invoice_id, 'received', p_invoice_id));
    -- نعيد خطأً منطقياً بدل رفع استثناء حتى لا تُلغى كتابة سجل التسوية
    return jsonb_build_object('error', 'invoice_mismatch');
  end if;
  if v_att.state <> 'creating' then raise exception 'invalid_state' using errcode = '55000'; end if;
  update app_private.payment_attempts
  set provider_invoice_id = p_invoice_id, payment_url = p_payment_url, expires_at = p_expires_at, state = 'pending',
      next_check_at = now() + interval '5 minutes'
  where id = p_attempt_id returning * into v_att;
  return jsonb_build_object('attempt_id', v_att.id, 'state', v_att.state, 'payment_url', v_att.payment_url);
end $$;

-- ───────── 048: تثبيت نتيجة الدفع (ذرّي: الحالة + الإيصال + الطلب + الإشعار) ─────────
create function public.apply_payment_event(
  p_provider text, p_environment app_private.provider_env, p_dedupe_key text, p_event_type text,
  p_merchant_ref text, p_provider_payment_id text, p_amount_minor bigint, p_currency text, p_outcome text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_event_id bigint;
  v_att app_private.payment_attempts;
  v_receipt_no text;
begin
  if p_outcome not in ('paid', 'failed', 'expired') then raise exception 'invalid_outcome' using errcode = '22023'; end if;

  insert into app_private.payment_events (provider, environment, dedupe_key, event_type, payload_min, process_state)
  values (p_provider, p_environment, p_dedupe_key, p_event_type,
          jsonb_build_object('merchant_ref', p_merchant_ref, 'amount_minor', p_amount_minor, 'currency', p_currency, 'outcome', p_outcome),
          'processing')
  on conflict (provider, environment, dedupe_key) do nothing
  returning id into v_event_id;
  if v_event_id is null then
    return jsonb_build_object('duplicate', true);   -- نفس الإشعار: ACK بلا أثر جديد
  end if;

  select * into v_att from app_private.payment_attempts
  where provider = p_provider and environment = p_environment and merchant_ref = p_merchant_ref for update;
  if not found then
    -- وصل الحدث قبل ربط المحاولة: يؤجَّل ويُعاد لاحقاً
    update app_private.payment_events set process_state = 'deferred', next_attempt_at = now() + interval '1 minute' where id = v_event_id;
    return jsonb_build_object('deferred', true);
  end if;
  update app_private.payment_events set payment_attempt_id = v_att.id where id = v_event_id;

  -- طابق المبلغ والعملة قبل التثبيت
  if v_att.amount_minor <> p_amount_minor or v_att.currency <> p_currency then
    update app_private.payment_events set process_state = 'quarantined', processed_at = now() where id = v_event_id;
    insert into app_private.payment_reconciliations (attempt_id, reason_code, details_min)
    values (v_att.id, 'amount_mismatch', jsonb_build_object('expected', v_att.amount_minor, 'received', p_amount_minor, 'currency', p_currency));
    return jsonb_build_object('quarantined', true);
  end if;

  if p_outcome = 'paid' then
    if v_att.state in ('paid', 'partially_refunded', 'refunded') then
      update app_private.payment_events set process_state = 'processed', processed_at = now() where id = v_event_id;
      return jsonb_build_object('already_paid', true);
    end if;
    update app_private.payment_attempts set state = 'paid', provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id), next_check_at = null
    where id = v_att.id;
    v_receipt_no := 'RC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('app_private.receipt_seq')::text, 6, '0');
    insert into app_private.receipts (payment_attempt_id, receipt_no) values (v_att.id, v_receipt_no) on conflict (payment_attempt_id) do nothing;
    if (select status from public.submissions where id = v_att.submission_id) = 'awaiting_payment' then
      perform app_private.transition_submission(v_att.submission_id, 'received', null, 'payment_confirmed');
    end if;
    perform app_private.notify((select author_id from public.submissions where id = v_att.submission_id),
                               'payment_paid:' || v_att.id::text, 'payment_paid', v_att.submission_id);
  else
    -- لا يتراجع تحصيل مؤكد بحدث متأخر؛ ما قبل التحصيل يصبح فاشلاً/منتهياً
    if v_att.state in ('creating', 'pending') then
      update app_private.payment_attempts set state = p_outcome::app_private.payment_state, next_check_at = null where id = v_att.id;
    end if;
  end if;

  update app_private.payment_events set process_state = 'processed', processed_at = now() where id = v_event_id;
  perform app_private.audit(null, 'apply_payment_event', 'payment_attempt', v_att.id, jsonb_build_object('outcome', p_outcome));
  return jsonb_build_object('attempt_id', v_att.id, 'outcome', p_outcome);
end $$;

-- ───────── 050: حالة الدفع لصاحب الطلب (الملكية من الخادم) ─────────
create function public.get_payment_status(p_submission_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_att app_private.payment_attempts;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.owns_submission(p_submission_id) then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v_att from app_private.payment_attempts where submission_id = p_submission_id order by created_at desc limit 1;
  if not found then return jsonb_build_object('state', 'none'); end if;
  return jsonb_build_object('state', v_att.state, 'amount_minor', v_att.amount_minor, 'currency', v_att.currency,
                            'receipt_no', (select receipt_no from app_private.receipts where payment_attempt_id = v_att.id));
end $$;

create function public.get_my_receipts() returns table (receipt_no text, issued_at timestamptz, amount_minor bigint, currency text, public_no text, state text)
language sql stable security definer set search_path = '' as $$
  select r.receipt_no, r.issued_at, a.amount_minor, a.currency::text, s.public_no, a.state::text
  from app_private.receipts r
  join app_private.payment_attempts a on a.id = r.payment_attempt_id
  join public.submissions s on s.id = a.submission_id
  where s.author_id = auth.uid()
  order by r.issued_at desc;
$$;

-- ───────── 049: الاسترداد (طالب ومعتمد منفصلان) ─────────
create function public.request_refund(p_attempt_id uuid, p_amount_minor bigint) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_att app_private.payment_attempts;
  v_used bigint;
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.has_role(v_uid, 'finance') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_att from app_private.payment_attempts where id = p_attempt_id for update;   -- قفل صف الدفعة
  if not found or v_att.state not in ('paid', 'partially_refunded') then raise exception 'not_refundable' using errcode = '55000'; end if;
  select coalesce(sum(amount_minor), 0) into v_used from app_private.refunds
  where payment_attempt_id = p_attempt_id and state in ('requested', 'approved', 'submitted', 'confirmed');
  if p_amount_minor <= 0 or v_used + p_amount_minor > v_att.amount_minor then raise exception 'refund_exceeds_collected' using errcode = '22023'; end if;
  insert into app_private.refunds (payment_attempt_id, amount_minor, requested_by) values (p_attempt_id, p_amount_minor, v_uid) returning id into v_id;
  perform app_private.audit(v_uid, 'request_refund', 'refund', v_id, jsonb_build_object('amount_minor', p_amount_minor));
  return v_id;
end $$;

create function public.approve_refund(p_refund_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ref app_private.refunds;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.has_role(v_uid, 'finance') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_ref from app_private.refunds where id = p_refund_id for update;
  if not found or v_ref.state <> 'requested' then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_ref.requested_by = v_uid then raise exception 'self_approval_forbidden' using errcode = '42501'; end if;
  update app_private.refunds set state = 'approved', approved_by = v_uid where id = p_refund_id;
  perform app_private.audit(v_uid, 'approve_refund', 'refund', p_refund_id);
end $$;

-- نتيجة الاسترداد من المزوّد (لخدمة التكامل): تثبيت المؤكد أو تحرير الحجز عند الفشل النهائي
create function public.apply_refund_result(p_refund_id uuid, p_provider_refund_id text, p_confirmed boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ref app_private.refunds;
  v_att app_private.payment_attempts;
  v_total bigint;
begin
  select * into v_ref from app_private.refunds where id = p_refund_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v_att from app_private.payment_attempts where id = v_ref.payment_attempt_id for update;
  if p_confirmed then
    update app_private.refunds set state = 'confirmed', provider_refund_id = p_provider_refund_id where id = p_refund_id;
    select coalesce(sum(amount_minor), 0) into v_total from app_private.refunds where payment_attempt_id = v_att.id and state = 'confirmed';
    update app_private.payment_attempts
    set state = case when v_total >= amount_minor then 'refunded' else 'partially_refunded' end::app_private.payment_state
    where id = v_att.id;
  else
    update app_private.refunds set state = 'failed' where id = p_refund_id;   -- يحرّر الحجز
  end if;
end $$;

-- ───────── 007: منح التنفيذ ─────────
revoke execute on function public.reserve_payment_attempt(uuid, uuid, text, app_private.provider_env) from public, anon, authenticated;
revoke execute on function public.attach_provider_invoice(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.apply_payment_event(text, app_private.provider_env, text, text, text, text, bigint, text, text) from public, anon, authenticated;
revoke execute on function public.apply_refund_result(uuid, text, boolean) from public, anon, authenticated;
revoke execute on function public.get_payment_status(uuid) from public, anon;
revoke execute on function public.get_my_receipts() from public, anon;
revoke execute on function public.request_refund(uuid, bigint) from public, anon;
revoke execute on function public.approve_refund(uuid) from public, anon;
grant execute on function public.reserve_payment_attempt(uuid, uuid, text, app_private.provider_env) to service_role;
grant execute on function public.attach_provider_invoice(uuid, text, text, timestamptz) to service_role;
grant execute on function public.apply_payment_event(text, app_private.provider_env, text, text, text, text, bigint, text, text) to service_role;
grant execute on function public.apply_refund_result(uuid, text, boolean) to service_role;
grant execute on function public.get_payment_status(uuid) to authenticated;
grant execute on function public.get_my_receipts() to authenticated;
grant execute on function public.request_refund(uuid, bigint) to authenticated;
grant execute on function public.approve_refund(uuid) to authenticated;
grant execute on function app_private.current_fee(text) to service_role;
