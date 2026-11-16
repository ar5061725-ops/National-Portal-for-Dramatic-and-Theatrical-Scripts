-- قائمة محاولات الدفع المعلّقة (لها فاتورة لدى المزوّد) لمسار التسوية التلقائية؛ للخادم فقط (service_role).
create function public.list_pending_payment_attempts(p_submission_ids uuid[] default null, p_limit int default 50)
returns table (submission_id uuid, merchant_ref text, provider_invoice_id text, environment text)
language sql stable security definer set search_path = '' as $$
  select a.submission_id, a.merchant_ref, a.provider_invoice_id, a.environment::text
  from app_private.payment_attempts a
  where a.state = 'pending' and a.provider_invoice_id is not null
    and (p_submission_ids is null or a.submission_id = any (p_submission_ids))
  order by a.created_at
  limit least(greatest(p_limit, 1), 200);
$$;
revoke execute on function public.list_pending_payment_attempts(uuid[], int) from public, anon, authenticated;
grant execute on function public.list_pending_payment_attempts(uuid[], int) to service_role;
