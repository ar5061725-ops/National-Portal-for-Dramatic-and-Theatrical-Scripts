-- الدفعة 03 (الأوامر 021–026، 032، 040): اللجنة، التقييم، القرارات، النسخ المعدّلة، سجل التدقيق.

-- ───────── 040: سجل التدقيق (إضافة فقط) ─────────
create table app_private.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  details_min jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity on app_private.audit_log (entity_type, entity_id, id);
alter table app_private.audit_log enable row level security;

create function app_private.audit(p_actor uuid, p_action text, p_entity_type text, p_entity_id uuid, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into app_private.audit_log (actor_id, action, entity_type, entity_id, details_min)
  values (p_actor, p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- نسخ الملفات للتعديلات: المفتاح فريد داخل النسخة لا على مستوى الجدول
alter table public.submission_files drop constraint submission_files_object_key_key;
alter table public.submission_files add constraint submission_files_version_key unique (version_id, object_key);

-- ───────── 021: review_assignments ─────────
create table public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.submission_versions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id),
  assigned_by uuid not null references public.profiles (id),
  status public.assignment_status not null default 'active',
  conflict_declared boolean not null default false,
  due_at timestamptz,
  assigned_at timestamptz not null default now(),
  constraint assignment_conflict_consistent check (not conflict_declared or status = 'declined')
);
create unique index review_assignments_one_active on public.review_assignments (version_id, reviewer_id) where status = 'active';
create index review_assignments_reviewer on public.review_assignments (reviewer_id, status);

-- ───────── 022: reviews, review_notes ─────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.review_assignments (id) on delete cascade,
  rubric_version text not null default 'v1',
  criteria_scores jsonb not null default '{}'::jsonb,
  score numeric(4, 2) check (score is null or (score >= 1 and score <= 10)),
  recommendation public.review_recommendation,
  submitted_at timestamptz,
  constraint review_submitted_complete check (submitted_at is null or (score is not null and recommendation is not null))
);

create table public.review_notes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  locator text not null check (length(trim(locator)) between 1 and 120),
  body text not null check (length(trim(body)) between 1 and 2000),
  visible_to_author boolean not null default false,
  created_at timestamptz not null default now()
);
create index review_notes_review on public.review_notes (review_id);

-- ───────── 023: decisions, revision_replies ─────────
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null unique references public.submission_versions (id),  -- قرار نهائي واحد للنسخة
  outcome public.decision_outcome not null,
  reason text not null check (length(trim(reason)) between 3 and 2000),
  decided_by uuid not null references public.profiles (id),
  decided_at timestamptz not null default now()
);

create table public.revision_replies (
  id uuid primary key default gen_random_uuid(),
  review_note_id uuid not null references public.review_notes (id),
  new_version_id uuid not null references public.submission_versions (id) on delete cascade,
  reply text not null check (length(trim(reply)) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (review_note_id, new_version_id)
);

-- ───────── 027: certificates ─────────
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null unique references public.decisions (id),
  verification_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  object_key text,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  reason text,
  constraint certificate_revoked_reason check (revoked_at is null or reason is not null)
);

-- ───────── مساعدات الصلاحية (قراءة الصفوف من القاعدة عند كل فحص) ─────────
create function app_private.owns_assignment(p_assignment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.review_assignments a
    where a.id = p_assignment and a.reviewer_id = (select auth.uid()) and a.status = 'active'
      and not a.conflict_declared and app_private.has_role(a.reviewer_id, 'reviewer')
  );
$$;
grant execute on function app_private.owns_assignment(uuid) to authenticated, service_role;

create function app_private.author_can_see_note(p_note uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.review_notes n
    join public.reviews r on r.id = n.review_id
    join public.review_assignments a on a.id = r.assignment_id
    join public.submission_versions v on v.id = a.version_id
    join public.submissions s on s.id = v.submission_id
    where n.id = p_note and n.visible_to_author and s.author_id = (select auth.uid())
  );
$$;
grant execute on function app_private.author_can_see_note(uuid) to authenticated, service_role;

create function app_private.owns_decision(p_decision uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.decisions d
    join public.submission_versions v on v.id = d.version_id
    join public.submissions s on s.id = v.submission_id
    where d.id = p_decision and s.author_id = (select auth.uid())
  );
$$;
grant execute on function app_private.owns_decision(uuid) to authenticated, service_role;

-- ───────── 032: RLS للجنة (لا قراءة مباشرة لبيانات المؤلف) ─────────
alter table public.review_assignments enable row level security;
alter table public.reviews enable row level security;
alter table public.review_notes enable row level security;
alter table public.decisions enable row level security;
alter table public.revision_replies enable row level security;
alter table public.certificates enable row level security;
revoke all on public.review_assignments, public.reviews, public.review_notes, public.decisions,
  public.revision_replies, public.certificates from anon, authenticated;
grant select on public.review_assignments, public.reviews, public.review_notes, public.decisions,
  public.revision_replies, public.certificates to authenticated;

create policy assignments_read_own on public.review_assignments for select to authenticated
  using (reviewer_id = (select auth.uid()) or app_private.has_role((select auth.uid()), 'committee_manager'));
create policy reviews_read_own on public.reviews for select to authenticated using (app_private.owns_assignment(assignment_id));
create policy notes_reviewer_read on public.review_notes for select to authenticated using (app_private.owns_assignment((select assignment_id from public.reviews where id = review_id)));
create policy notes_author_read on public.review_notes for select to authenticated using (app_private.author_can_see_note(id));
create policy decisions_read on public.decisions for select to authenticated
  using (app_private.owns_version(version_id) or app_private.has_role((select auth.uid()), 'committee_manager'));
create policy replies_author_read on public.revision_replies for select to authenticated using (app_private.owns_version(new_version_id));
create policy certificates_author_read on public.certificates for select to authenticated using (app_private.owns_decision(decision_id));

-- ───────── قائمة المراجع المعمّاة: رمز الطلب والنسخة فقط، بلا بيانات المؤلف ─────────
create function public.get_review_queue() returns table (
  assignment_id uuid, version_id uuid, public_no text, work_type public.work_type, genre_codes text[],
  logline text, episodes_count int, acts_count int, duration_minutes int, due_at timestamptz, version_no int
) language sql stable security definer set search_path = '' as $$
  select a.id, v.id, s.public_no, v.work_type, v.genre_codes, v.logline, v.episodes_count, v.acts_count,
         v.duration_minutes, a.due_at, v.version_no
  from public.review_assignments a
  join public.submission_versions v on v.id = a.version_id
  join public.submissions s on s.id = v.submission_id
  where a.reviewer_id = auth.uid() and a.status = 'active' and not a.conflict_declared
    and app_private.has_role(auth.uid(), 'reviewer')
  order by a.assigned_at;
$$;

-- ───────── 024: التعيين والتنحي ─────────
create function public.assign_review(p_version_id uuid, p_reviewer_id uuid, p_due_at timestamptz default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.submissions;
  v_ver public.submission_versions;
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.has_role(v_uid, 'committee_manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not app_private.has_role(p_reviewer_id, 'reviewer') then raise exception 'not_a_reviewer' using errcode = '22023'; end if;

  select s.* into v_sub from public.submissions s
  where s.id = (select submission_id from public.submission_versions where id = p_version_id) for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v_ver from public.submission_versions where id = p_version_id;
  if v_ver.sealed_at is null or v_sub.current_version_id <> p_version_id or v_sub.status not in ('received', 'in_review') then
    raise exception 'version_not_reviewable' using errcode = '55000';
  end if;
  if v_sub.author_id = p_reviewer_id then raise exception 'self_review_forbidden' using errcode = '42501'; end if;

  insert into public.review_assignments (version_id, reviewer_id, assigned_by, due_at)
  values (p_version_id, p_reviewer_id, v_uid,
          coalesce(p_due_at, now() + make_interval(days => coalesce((select (value #>> '{}')::int from public.app_settings where setting_key = 'review_sla_days'), 14))))
  returning id into v_id;

  if v_sub.status = 'received' then
    perform app_private.transition_submission(v_sub.id, 'in_review', v_uid, 'assigned');
  end if;
  perform app_private.audit(v_uid, 'assign_review', 'review_assignment', v_id, jsonb_build_object('version_id', p_version_id));
  return v_id;
end $$;

create function public.declare_review_conflict(p_assignment_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  update public.review_assignments
  set status = 'declined', conflict_declared = true
  where id = p_assignment_id and reviewer_id = v_uid and status = 'active';
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform app_private.audit(v_uid, 'declare_conflict', 'review_assignment', p_assignment_id, jsonb_build_object('reason', left(coalesce(p_reason, ''), 300)));
end $$;

-- ───────── 025: حفظ التقييم ─────────
create function public.save_review(
  p_assignment_id uuid, p_criteria jsonb, p_recommendation public.review_recommendation, p_notes jsonb, p_submit boolean default false
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_a public.review_assignments;
  v_review_id uuid;
  v_score numeric(4, 2);
  v_note jsonb;
  v_val numeric;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select * into v_a from public.review_assignments where id = p_assignment_id for update;
  if not found or v_a.reviewer_id <> v_uid or v_a.status <> 'active' or v_a.conflict_declared
     or not app_private.has_role(v_uid, 'reviewer') then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_criteria) <> 'object' or (select count(*) from jsonb_object_keys(p_criteria)) not between 1 and 12 then
    raise exception 'invalid_criteria' using errcode = '22023';
  end if;
  for v_val in select (value #>> '{}')::numeric from jsonb_each(p_criteria) loop
    if v_val < 1 or v_val > 10 then raise exception 'invalid_score' using errcode = '22023'; end if;
  end loop;
  select round(avg((value #>> '{}')::numeric), 2) into v_score from jsonb_each(p_criteria);

  insert into public.reviews (assignment_id, criteria_scores, score, recommendation, submitted_at)
  values (p_assignment_id, p_criteria, v_score, p_recommendation, case when p_submit then now() end)
  on conflict (assignment_id) do update
    set criteria_scores = excluded.criteria_scores, score = excluded.score,
        recommendation = excluded.recommendation,
        submitted_at = case when p_submit then now() else public.reviews.submitted_at end
    where public.reviews.submitted_at is null
  returning id into v_review_id;
  if v_review_id is null then raise exception 'review_already_submitted' using errcode = '55000'; end if;

  delete from public.review_notes where review_id = v_review_id;
  if p_notes is not null and jsonb_typeof(p_notes) = 'array' then
    if jsonb_array_length(p_notes) > 50 then raise exception 'too_many_notes' using errcode = '22023'; end if;
    for v_note in select * from jsonb_array_elements(p_notes) loop
      insert into public.review_notes (review_id, locator, body)
      values (v_review_id, left(coalesce(v_note ->> 'locator', 'عام'), 120), left(v_note ->> 'body', 2000));
    end loop;
  end if;
  if p_submit then update public.review_assignments set status = 'completed' where id = p_assignment_id; end if;
  return v_review_id;
end $$;

-- ───────── 025: اعتماد القرار (قرار واحد للنسخة حتى عند التزامن) ─────────
create function public.record_decision(p_version_id uuid, p_outcome public.decision_outcome, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.submissions;
  v_dec_id uuid;
  v_cert public.certificates;
  v_status public.submission_status;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.has_role(v_uid, 'committee_manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  select s.* into v_sub from public.submissions s
  where s.id = (select submission_id from public.submission_versions where id = p_version_id) for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_sub.current_version_id <> p_version_id or v_sub.status <> 'in_review' then
    raise exception 'version_not_decidable' using errcode = '55000';
  end if;
  if exists (select 1 from public.review_assignments a where a.version_id = p_version_id and a.status = 'active')
     and not exists (select 1 from public.review_assignments a join public.reviews r on r.assignment_id = a.id
                     where a.version_id = p_version_id and r.submitted_at is not null) then
    raise exception 'review_incomplete' using errcode = '55000';
  end if;

  insert into public.decisions (version_id, outcome, reason, decided_by) values (p_version_id, p_outcome, p_reason, v_uid)
  returning id into v_dec_id;

  v_status := case p_outcome when 'approved' then 'approved' when 'revision_requested' then 'revision_requested' else 'rejected' end;
  perform app_private.transition_submission(v_sub.id, v_status, v_uid, 'decision');

  -- ملاحظات اللجنة تُنشر للمؤلف بعد القرار فقط
  update public.review_notes set visible_to_author = true
  where review_id in (select r.id from public.reviews r join public.review_assignments a on a.id = r.assignment_id where a.version_id = p_version_id);

  if p_outcome = 'approved' then
    insert into public.certificates (decision_id) values (v_dec_id) returning * into v_cert;
  end if;
  perform app_private.notify(v_sub.author_id, 'decision:' || v_dec_id::text, 'decision_' || p_outcome::text, v_sub.id);
  perform app_private.audit(v_uid, 'record_decision', 'decision', v_dec_id, jsonb_build_object('outcome', p_outcome));
  return jsonb_build_object('decision_id', v_dec_id, 'status', v_status, 'verification_code', v_cert.verification_code);
end $$;

-- ───────── 026: نسخة معدّلة ─────────
create function public.create_revision_draft(p_submission_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.submissions;
  v_old public.submission_versions;
  v_new_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select * into v_sub from public.submissions where id = p_submission_id for update;
  if not found or v_sub.author_id <> v_uid then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_sub.status <> 'revision_requested' then raise exception 'revision_not_requested' using errcode = '55000'; end if;
  select * into v_old from public.submission_versions where id = v_sub.current_version_id;
  -- مسودة تعديل قائمة؟ أعدها (طلبان متزامنان لا يُنشئان نسختين)
  select id into v_new_id from public.submission_versions
  where submission_id = p_submission_id and sealed_at is null order by version_no desc limit 1;
  if v_new_id is not null then return v_new_id; end if;

  insert into public.submission_versions (submission_id, version_no, title, work_type, genre_codes, logline, episodes_count, acts_count, duration_minutes, work_registry_no)
  values (p_submission_id, v_old.version_no + 1, v_old.title, v_old.work_type, v_old.genre_codes, v_old.logline, v_old.episodes_count, v_old.acts_count, v_old.duration_minutes, v_old.work_registry_no)
  returning id into v_new_id;
  insert into public.submission_files (version_id, kind, audience, bucket_id, object_key, sha256, size_bytes, mime_type, scan_status)
  select v_new_id, kind, audience, bucket_id, object_key, sha256, size_bytes, mime_type, scan_status
  from public.submission_files where version_id = v_old.id and audience = 'author';
  return v_new_id;
end $$;

create function public.submit_revision(p_version_id uuid, p_idempotency_key text, p_replies jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hash text := md5(p_version_id::text);
  v_prev app_private.request_idempotency;
  v_sub public.submissions;
  v_ver public.submission_versions;
  v_missing text[];
  v_reply jsonb;
  v_result jsonb;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  perform app_private.idem_lock(v_uid, 'submit_revision', p_idempotency_key);
  select * into v_prev from app_private.request_idempotency
  where actor_id = v_uid and operation = 'submit_revision' and idem_key = p_idempotency_key;
  if found then
    if v_prev.request_hash <> v_hash then raise exception 'idempotency_conflict' using errcode = '22023'; end if;
    return v_prev.result_min;
  end if;

  select s.* into v_sub from public.submissions s
  where s.id = (select submission_id from public.submission_versions where id = p_version_id) for update;
  if not found or v_sub.author_id <> v_uid then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v_ver from public.submission_versions where id = p_version_id for update;
  if v_sub.status <> 'revision_requested' or v_ver.sealed_at is not null then raise exception 'revision_not_open' using errcode = '55000'; end if;
  if length(trim(v_ver.title)) = 0 or length(trim(v_ver.logline)) = 0 then raise exception 'incomplete_fields' using errcode = '23514'; end if;

  select coalesce(array_agg(k::text), '{}') into v_missing
  from unnest(enum_range(null::public.file_kind)) k
  where not exists (select 1 from public.submission_files f
                    where f.version_id = p_version_id and f.kind = k and f.audience = 'author' and f.scan_status = 'clean');
  if cardinality(v_missing) > 0 then raise exception 'incomplete_files: %', array_to_string(v_missing, ',') using errcode = '23514'; end if;

  if p_replies is not null and jsonb_typeof(p_replies) = 'array' then
    for v_reply in select * from jsonb_array_elements(p_replies) loop
      -- الرد على ملاحظة طلب آخر يُرفض: الملاحظة يجب أن تخص الطلب نفسه ومنشورة للمؤلف
      if not exists (
        select 1 from public.review_notes n
        join public.reviews r on r.id = n.review_id
        join public.review_assignments a on a.id = r.assignment_id
        join public.submission_versions ov on ov.id = a.version_id
        where n.id = (v_reply ->> 'note_id')::uuid and ov.submission_id = v_sub.id and n.visible_to_author
      ) then raise exception 'invalid_note' using errcode = '22023'; end if;
      insert into public.revision_replies (review_note_id, new_version_id, reply)
      values ((v_reply ->> 'note_id')::uuid, p_version_id, left(v_reply ->> 'reply', 2000))
      on conflict (review_note_id, new_version_id) do update set reply = excluded.reply;
    end loop;
  end if;

  update public.submission_versions set sealed_at = now() where id = p_version_id;
  update public.submissions set current_version_id = p_version_id where id = v_sub.id;
  perform app_private.transition_submission(v_sub.id, 'in_review', v_uid, 'revision');
  perform app_private.notify(v_uid, 'revision_received:' || p_version_id::text, 'revision_received', v_sub.id);

  v_result := jsonb_build_object('submission_id', v_sub.id, 'public_no', v_sub.public_no, 'status', 'in_review');
  insert into app_private.request_idempotency (actor_id, operation, idem_key, request_hash, result_min)
  values (v_uid, 'submit_revision', p_idempotency_key, v_hash, v_result);
  return v_result;
end $$;

-- ───────── 007: منح التنفيذ لكل توقيع ─────────
revoke execute on function public.get_review_queue() from public, anon;
revoke execute on function public.assign_review(uuid, uuid, timestamptz) from public, anon;
revoke execute on function public.declare_review_conflict(uuid, text) from public, anon;
revoke execute on function public.save_review(uuid, jsonb, public.review_recommendation, jsonb, boolean) from public, anon;
revoke execute on function public.record_decision(uuid, public.decision_outcome, text) from public, anon;
revoke execute on function public.create_revision_draft(uuid) from public, anon;
revoke execute on function public.submit_revision(uuid, text, jsonb) from public, anon;
grant execute on function public.get_review_queue() to authenticated;
grant execute on function public.assign_review(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.declare_review_conflict(uuid, text) to authenticated;
grant execute on function public.save_review(uuid, jsonb, public.review_recommendation, jsonb, boolean) to authenticated;
grant execute on function public.record_decision(uuid, public.decision_outcome, text) to authenticated;
grant execute on function public.create_revision_draft(uuid) to authenticated;
grant execute on function public.submit_revision(uuid, text, jsonb) to authenticated;
