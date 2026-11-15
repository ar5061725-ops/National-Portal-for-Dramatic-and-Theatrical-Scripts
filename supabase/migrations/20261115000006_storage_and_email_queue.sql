-- الدفعة 06 (الأوامر 036، 038، 069): حاويات Storage الخاصة وسياساتها، وطابور بريد المعاملات.

-- ───────── 036: حاويات خاصة (PDF فقط) ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('submissions-portal', 'submissions-portal', false, 20971520, array['application/pdf']),
  ('review-blind-portal', 'review-blind-portal', false, 20971520, array['application/pdf']),
  ('certificates-portal', 'certificates-portal', false, 5242880, array['application/pdf']),
  ('learning-portal', 'learning-portal', false, 31457280, array['application/pdf'])
on conflict (id) do nothing;

-- المراجع يصل للنسخة المعمّاة المعيّنة له فقط (المسار: <version_id>/...)
create function app_private.reviewer_has_version(p_version_text text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_version_text ~ '^[0-9a-f-]{36}$' and exists (
    select 1 from public.review_assignments a
    where a.version_id = p_version_text::uuid and a.reviewer_id = (select auth.uid())
      and a.status = 'active' and not a.conflict_declared and app_private.has_role(a.reviewer_id, 'reviewer')
  );
$$;
grant execute on function app_private.reviewer_has_version(text) to authenticated;

-- المؤلف: يرفع ويقرأ داخل مجلده فقط (المسار: <author_id>/<version_id>/<random>.pdf)
create policy submissions_author_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions-portal' and (storage.foldername(name))[1] = (select auth.uid())::text
              and lower(storage.extension(name)) = 'pdf');
create policy submissions_author_read on storage.objects for select to authenticated
  using (bucket_id = 'submissions-portal' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- النسخة المعمّاة: قراءة للمراجع المعيّن فقط، بلا رفع من العميل
create policy review_blind_reviewer_read on storage.objects for select to authenticated
  using (bucket_id = 'review-blind-portal' and app_private.reviewer_has_version((storage.foldername(name))[1]));

-- الشهادات: قراءة لصاحبها (المسار: <author_id>/...)
create policy certificates_author_read on storage.objects for select to authenticated
  using (bucket_id = 'certificates-portal' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- learning-portal: لا سياسات؛ تُعرض النسخة المنشورة عبر مسار GET آمن/رابط موقّع من الخادم فقط.

-- ───────── 069: طابور بريد المعاملات (حجز بـ SKIP LOCKED) ─────────
create function public.claim_email_jobs(p_batch int, p_lease_seconds int)
returns table (id uuid, user_id uuid, template_key text, dedupe_key text, attempts int)
language sql security definer set search_path = '' as $$
  with picked as (
    select o.id from app_private.email_outbox o
    where (o.state in ('pending', 'failed') and o.next_attempt_at <= now())
       or (o.state = 'sending' and o.lease_until < now())
    order by o.next_attempt_at
    limit least(greatest(p_batch, 1), 100)
    for update skip locked
  )
  update app_private.email_outbox o
  set state = 'sending', lease_until = now() + make_interval(secs => greatest(p_lease_seconds, 30)), attempts = o.attempts + 1
  from picked where o.id = picked.id
  returning o.id, o.user_id, o.template_key, o.dedupe_key, o.attempts;
$$;

create function public.mark_email_result(p_id uuid, p_ok boolean, p_provider_message_id text, p_error_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_job app_private.email_outbox;
begin
  select * into v_job from app_private.email_outbox where id = p_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_ok then
    update app_private.email_outbox set state = 'sent', sent_at = now(), lease_until = null, provider_message_id = p_provider_message_id where id = p_id;
  elsif v_job.attempts >= 6 then
    update app_private.email_outbox set state = 'dead', lease_until = null, last_error_code = p_error_code where id = p_id;   -- يُحجر للمراجعة
  else
    update app_private.email_outbox
    set state = 'failed', lease_until = null, last_error_code = p_error_code,
        next_attempt_at = now() + make_interval(mins => power(2, v_job.attempts)::int)   -- تأخير متزايد
    where id = p_id;
  end if;
end $$;

revoke execute on function public.claim_email_jobs(int, int) from public, anon, authenticated;
revoke execute on function public.mark_email_result(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.claim_email_jobs(int, int) to service_role;
grant execute on function public.mark_email_result(uuid, boolean, text, text) to service_role;
