-- يضيف public_no إلى ناتج حجز محاولة الدفع (لرابط العودة من المزوّد) ودالة قراءة الرسم الحالي لعرضه للمؤلف.
-- ملاحظة تشغيلية: قاعدة الرسم التجريبية (5.000 د.ك) وتفعيل fees_enabled أُدخلا كبيانات مباشرة لا كهجرة:
--   insert into app_private.fee_rules (service_code, amount_minor, effective_at) values ('submission', 5000, now());
--   update public.app_settings set value = 'true'::jsonb where setting_key = 'fees_enabled';

create or replace function public.reserve_payment_attempt(p_user_id uuid, p_submission_id uuid, p_idempotency_key text, p_environment app_private.provider_env)
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
                            'currency', v_att.currency, 'state', v_att.state, 'payment_url', v_att.payment_url, 'reused', v_reused,
                            'public_no', v_sub.public_no);
end $$;

create function public.get_current_fee() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('amount_minor', f.amount_minor, 'currency', f.currency)
     from app_private.current_fee('submission') f where f.id is not null),
    jsonb_build_object('amount_minor', null, 'currency', 'KWD'));
$$;
revoke execute on function public.get_current_fee() from public, anon;
grant execute on function public.get_current_fee() to authenticated;
