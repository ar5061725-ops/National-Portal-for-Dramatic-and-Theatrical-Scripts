-- الدفعة 02 (الأوامر 011–020): الهوية، الأدوار، الطلبات، النسخ، الملفات، الإشعارات، RPC التقديم.

grant usage on schema app_private to authenticated, service_role;

-- ───────── 011: profiles ─────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  profile_status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function app_private.touch_updated_at();

-- ───────── 012: user_roles ─────────
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index user_roles_one_active on public.user_roles (user_id, role) where revoked_at is null;

create function app_private.has_role(p_user uuid, p_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = p_user and ur.role = p_role and ur.revoked_at is null and p.profile_status = 'active'
  );
$$;
grant execute on function app_private.has_role(uuid, public.app_role) to authenticated, service_role;

-- ───────── 013: producer_profiles ─────────
create table public.producer_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  organization text not null check (length(trim(organization)) between 2 and 160),
  verification_status public.producer_verification not null default 'pending',
  verified_by uuid references auth.users (id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint producer_verified_fields check (verification_status <> 'verified' or (verified_by is not null and verified_at is not null))
);

-- ───────── 014: مشغّل الملف الشخصي (الدور من الخادم لا من metadata) ─────────
create function app_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'مستخدم');
  insert into public.profiles (id, full_name) values (new.id, left(rpad(v_name, 2, '_'), 120));
  insert into public.user_roles (user_id, role) values (new.id, 'author');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- ───────── 015: submissions ─────────
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  public_no text not null unique default ('NSP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  author_id uuid not null references public.profiles (id) on delete restrict,
  status public.submission_status not null default 'draft',
  current_version_id uuid,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger submissions_touch before update on public.submissions
  for each row execute function app_private.touch_updated_at();
create index submissions_author_updated on public.submissions (author_id, updated_at desc);
create index submissions_work_queue on public.submissions (status, updated_at)
  where status in ('awaiting_payment', 'received', 'in_review', 'revision_requested');

-- ───────── 016: submission_versions ─────────
create table public.submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  version_no int not null check (version_no >= 1),
  title text not null default '' check (length(title) <= 200),
  work_type public.work_type not null,
  genre_codes text[] not null default '{}',
  logline text not null default '' check (length(logline) <= 300),
  episodes_count int check (episodes_count is null or episodes_count > 0),
  acts_count int check (acts_count is null or acts_count > 0),
  duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  work_registry_no text check (work_registry_no is null or length(work_registry_no) <= 40),
  sealed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (submission_id, version_no),
  unique (id, submission_id),
  -- النسخة المختومة مكتملة بحسب نوع العمل
  constraint version_sealed_complete check (
    sealed_at is null or (
      length(trim(title)) > 0 and length(trim(logline)) > 0 and
      case work_type
        when 'series' then episodes_count is not null
        when 'play' then acts_count is not null
        else duration_minutes is not null
      end
    )
  )
);
-- مفتاح خارجي مركّب: لا يُعيَّن إصدار من طلب مختلف
alter table public.submissions
  add constraint submissions_current_version_fk
  foreign key (current_version_id, id) references public.submission_versions (id, submission_id);

-- ───────── 017: submission_files ─────────
create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.submission_versions (id) on delete cascade,
  kind public.file_kind not null,
  audience public.file_audience not null default 'author',
  bucket_id text not null default 'submissions-portal',
  object_key text not null unique,
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  mime_type text not null check (mime_type = 'application/pdf'),
  scan_status public.scan_status not null default 'pending',
  created_at timestamptz not null default now()
);
create unique index submission_files_one_per_kind on public.submission_files (version_id, kind, audience);

-- ───────── 018: تاريخ حالات الطلب ─────────
create table public.submission_status_history (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  version_id uuid references public.submission_versions (id),
  from_status public.submission_status,
  to_status public.submission_status not null,
  changed_by uuid references auth.users (id),
  reason_code text,
  created_at timestamptz not null default now()
);
create index submission_history_by_submission on public.submission_status_history (submission_id, id);

-- الانتقال والتاريخ في معاملة واحدة
create function app_private.transition_submission(p_submission uuid, p_to public.submission_status, p_actor uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.submissions;
  allowed public.submission_status[];
begin
  select * into s from public.submissions where id = p_submission for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  allowed := case s.status
    when 'draft' then array['awaiting_payment', 'received']::public.submission_status[]
    when 'awaiting_payment' then array['received']::public.submission_status[]
    when 'received' then array['in_review']::public.submission_status[]
    when 'in_review' then array['revision_requested', 'approved', 'rejected']::public.submission_status[]
    when 'revision_requested' then array['in_review', 'awaiting_payment', 'received']::public.submission_status[]
    else array[]::public.submission_status[]
  end;
  if not (p_to = any (allowed)) then
    raise exception 'invalid_transition: % -> %', s.status, p_to using errcode = '55000';
  end if;
  update public.submissions set status = p_to where id = p_submission;
  insert into public.submission_status_history (submission_id, version_id, from_status, to_status, changed_by, reason_code)
  values (p_submission, s.current_version_id, s.status, p_to, p_actor, p_reason);
end $$;

-- ───────── 068 (مبكراً): الإشعارات وطابور البريد ─────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  related_submission_id uuid references public.submissions (id) on delete set null,
  event_key text not null,
  template_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);
create index notifications_user_created on public.notifications (user_id, created_at desc);

create table app_private.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  template_key text not null,
  dedupe_key text not null unique,
  state app_private.email_state not null default 'pending',
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index email_outbox_waiting on app_private.email_outbox (next_attempt_at) where state in ('pending', 'failed');

-- حدث واحد = إشعار واحد وبريد واحد
create function app_private.notify(p_user uuid, p_event_key text, p_template text, p_submission uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, related_submission_id, event_key, template_key)
  values (p_user, p_submission, p_event_key, p_template)
  on conflict (user_id, event_key) do nothing;
  insert into app_private.email_outbox (user_id, template_key, dedupe_key)
  values (p_user, p_template, p_user::text || ':' || p_event_key)
  on conflict (dedupe_key) do nothing;
end $$;

-- ───────── مساعد الملكية (يُستخدم في سياسات RLS) ─────────
create function app_private.owns_submission(p_submission uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.submissions s where s.id = p_submission and s.author_id = (select auth.uid()));
$$;
grant execute on function app_private.owns_submission(uuid) to authenticated, service_role;

create function app_private.owns_version(p_version uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.submission_versions v
    join public.submissions s on s.id = v.submission_id
    where v.id = p_version and s.author_id = (select auth.uid())
  );
$$;
grant execute on function app_private.owns_version(uuid) to authenticated, service_role;

-- ───────── 031: RLS للمؤلف ─────────
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.producer_profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_versions enable row level security;
alter table public.submission_files enable row level security;
alter table public.submission_status_history enable row level security;
alter table public.notifications enable row level security;
alter table app_private.email_outbox enable row level security;

revoke all on public.profiles, public.user_roles, public.producer_profiles, public.submissions,
  public.submission_versions, public.submission_files, public.submission_status_history, public.notifications
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone_e164) on public.profiles to authenticated;  -- لا تعديل لحالة الحساب
grant select on public.user_roles, public.producer_profiles, public.submissions, public.submission_versions,
  public.submission_files, public.submission_status_history to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy profiles_read_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy user_roles_read_own on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
create policy producer_profiles_read_own on public.producer_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy submissions_author_read on public.submissions for select to authenticated using ((select auth.uid()) = author_id);
create policy versions_author_read on public.submission_versions for select to authenticated using (app_private.owns_submission(submission_id));
create policy files_author_read on public.submission_files for select to authenticated
  using (audience = 'author' and app_private.owns_version(version_id));
create policy history_author_read on public.submission_status_history for select to authenticated using (app_private.owns_submission(submission_id));
create policy notifications_read_own on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────── 019: RPC إنشاء وتعديل المسودة ─────────
create function public.create_submission_draft(p_work_type public.work_type) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.submissions;
  v_ver public.submission_versions;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.has_role(v_uid, 'author') then raise exception 'forbidden' using errcode = '42501'; end if;
  if (select value from public.app_settings where setting_key = 'submissions_open') = 'false'::jsonb then
    raise exception 'submissions_closed' using errcode = '55000';
  end if;
  if p_work_type = 'film' and coalesce((select value from public.app_settings where setting_key = 'film_enabled'), 'false'::jsonb) <> 'true'::jsonb then
    raise exception 'work_type_disabled' using errcode = '55000';
  end if;

  insert into public.submissions (author_id) values (v_uid) returning * into v_sub;
  insert into public.submission_versions (submission_id, version_no, work_type)
  values (v_sub.id, 1, p_work_type) returning * into v_ver;
  update public.submissions set current_version_id = v_ver.id where id = v_sub.id;
  insert into public.submission_status_history (submission_id, version_id, from_status, to_status, changed_by)
  values (v_sub.id, v_ver.id, null, 'draft', v_uid);

  return jsonb_build_object('submission_id', v_sub.id, 'version_id', v_ver.id, 'public_no', v_sub.public_no);
end $$;

create function public.update_draft_version(p_version_id uuid, p_patch jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.submissions;
  v_ver public.submission_versions;
  v_genres text[];
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if jsonb_typeof(p_patch) <> 'object' then raise exception 'invalid_patch' using errcode = '22023'; end if;
  if (select count(*) from jsonb_object_keys(p_patch)) > 12 then raise exception 'invalid_patch' using errcode = '22023'; end if;
  if exists (
    select 1 from jsonb_object_keys(p_patch) k
    where k not in ('title', 'logline', 'genre_codes', 'episodes_count', 'acts_count', 'duration_minutes', 'work_registry_no')
  ) then raise exception 'invalid_field' using errcode = '22023'; end if;

  select s.* into v_sub from public.submissions s
  where s.id = (select submission_id from public.submission_versions where id = p_version_id) for update;
  if not found or v_sub.author_id <> v_uid then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v_ver from public.submission_versions where id = p_version_id for update;
  if v_ver.sealed_at is not null or v_sub.status not in ('draft', 'revision_requested') then
    raise exception 'version_sealed' using errcode = '55000';
  end if;

  if p_patch ? 'genre_codes' then
    select coalesce(array_agg(g), '{}') into v_genres from jsonb_array_elements_text(p_patch -> 'genre_codes') g;
    if cardinality(v_genres) > 6 or exists (
      select 1 from unnest(v_genres) g where not exists (select 1 from public.work_genres w where w.code = g and w.active)
    ) then raise exception 'invalid_genre' using errcode = '22023'; end if;
  end if;

  update public.submission_versions set
    title = case when p_patch ? 'title' then left(trim(p_patch ->> 'title'), 200) else title end,
    logline = case when p_patch ? 'logline' then left(trim(p_patch ->> 'logline'), 300) else logline end,
    genre_codes = case when p_patch ? 'genre_codes' then v_genres else genre_codes end,
    episodes_count = case when p_patch ? 'episodes_count' then nullif(p_patch ->> 'episodes_count', '')::int else episodes_count end,
    acts_count = case when p_patch ? 'acts_count' then nullif(p_patch ->> 'acts_count', '')::int else acts_count end,
    duration_minutes = case when p_patch ? 'duration_minutes' then nullif(p_patch ->> 'duration_minutes', '')::int else duration_minutes end,
    work_registry_no = case when p_patch ? 'work_registry_no' then nullif(left(trim(p_patch ->> 'work_registry_no'), 40), '') else work_registry_no end
  where id = p_version_id;
  update public.submissions set updated_at = now() where id = v_sub.id;
end $$;

-- ───────── 037: تسجيل ملف مرفوع (المفتاح عشوائي ويُنشأ من الخادم) ─────────
create function public.register_submission_file(
  p_version_id uuid, p_kind public.file_kind, p_object_key text, p_size_bytes bigint, p_sha256 text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.submissions;
  v_ver public.submission_versions;
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select s.* into v_sub from public.submissions s
  where s.id = (select submission_id from public.submission_versions where id = p_version_id) for update;
  if not found or v_sub.author_id <> v_uid then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v_ver from public.submission_versions where id = p_version_id;
  if v_ver.sealed_at is not null or v_sub.status not in ('draft', 'revision_requested') then
    raise exception 'version_sealed' using errcode = '55000';
  end if;
  -- مسار الحاوية: <author_id>/<version_id>/<عشوائي>.pdf
  if p_object_key !~ ('^' || v_uid::text || '/' || p_version_id::text || '/[0-9a-f-]{32,}\.pdf$') then
    raise exception 'invalid_object_key' using errcode = '22023';
  end if;
  delete from public.submission_files where version_id = p_version_id and kind = p_kind and audience = 'author';
  insert into public.submission_files (version_id, kind, object_key, size_bytes, sha256, mime_type)
  values (p_version_id, p_kind, p_object_key, p_size_bytes, lower(p_sha256), 'application/pdf')
  returning id into v_id;
  return v_id;
end $$;

-- نتيجة الفحص تضعها دالة خادمية مخوّلة فقط (clean | rejected)
create function public.set_file_scan_status(p_file_id uuid, p_status public.scan_status) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_status = 'pending' then raise exception 'invalid_status' using errcode = '22023'; end if;
  update public.submission_files set scan_status = p_status where id = p_file_id and scan_status = 'pending';
  if not found then raise exception 'not_found_or_final' using errcode = 'P0002'; end if;
end $$;

-- ───────── 020: إرسال أول نسخة ─────────
create function public.submit_version(p_version_id uuid, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hash text := md5(p_version_id::text);
  v_prev app_private.request_idempotency;
  v_sub public.submissions;
  v_ver public.submission_versions;
  v_missing text[];
  v_target public.submission_status;
  v_result jsonb;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.has_role(v_uid, 'author') then raise exception 'forbidden' using errcode = '42501'; end if;
  perform app_private.idem_lock(v_uid, 'submit_version', p_idempotency_key);

  select * into v_prev from app_private.request_idempotency
  where actor_id = v_uid and operation = 'submit_version' and idem_key = p_idempotency_key;
  if found then
    if v_prev.request_hash <> v_hash then raise exception 'idempotency_conflict' using errcode = '22023'; end if;
    return v_prev.result_min;
  end if;

  select s.* into v_sub from public.submissions s
  where s.id = (select submission_id from public.submission_versions where id = p_version_id) for update;
  if not found or v_sub.author_id <> v_uid then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v_ver from public.submission_versions where id = p_version_id for update;
  if v_ver.sealed_at is not null or v_sub.status <> 'draft' then raise exception 'version_sealed' using errcode = '55000'; end if;
  if (select value from public.app_settings where setting_key = 'submissions_open') = 'false'::jsonb then
    raise exception 'submissions_closed' using errcode = '55000';
  end if;
  if length(trim(v_ver.title)) = 0 or length(trim(v_ver.logline)) = 0 then
    raise exception 'incomplete_fields' using errcode = '23514';
  end if;

  select coalesce(array_agg(k::text), '{}') into v_missing
  from unnest(enum_range(null::public.file_kind)) k
  where not exists (
    select 1 from public.submission_files f
    where f.version_id = p_version_id and f.kind = k and f.audience = 'author' and f.scan_status = 'clean'
  );
  if cardinality(v_missing) > 0 then
    raise exception 'incomplete_files: %', array_to_string(v_missing, ',') using errcode = '23514';
  end if;

  update public.submission_versions set sealed_at = now() where id = p_version_id;  -- قيد الاكتمال حسب النوع يُنفَّذ هنا
  v_target := case
    when coalesce((select value from public.app_settings where setting_key = 'fees_enabled'), 'false'::jsonb) = 'true'::jsonb
      then 'awaiting_payment' else 'received' end;
  update public.submissions set submitted_at = coalesce(submitted_at, now()) where id = v_sub.id;
  perform app_private.transition_submission(v_sub.id, v_target, v_uid, 'submit');
  if v_target = 'received' then
    perform app_private.notify(v_uid, 'submission_received:' || v_sub.id::text, 'submission_received', v_sub.id);
  end if;

  v_result := jsonb_build_object('submission_id', v_sub.id, 'public_no', v_sub.public_no, 'status', v_target);
  insert into app_private.request_idempotency (actor_id, operation, idem_key, request_hash, result_min)
  values (v_uid, 'submit_version', p_idempotency_key, v_hash, v_result);
  return v_result;
end $$;

-- ───────── 007: منح التنفيذ لكل توقيع على حدة ─────────
revoke execute on function public.create_submission_draft(public.work_type) from public, anon;
revoke execute on function public.update_draft_version(uuid, jsonb) from public, anon;
revoke execute on function public.register_submission_file(uuid, public.file_kind, text, bigint, text) from public, anon;
revoke execute on function public.set_file_scan_status(uuid, public.scan_status) from public, anon, authenticated;
revoke execute on function public.submit_version(uuid, text) from public, anon;
grant execute on function public.create_submission_draft(public.work_type) to authenticated;
grant execute on function public.update_draft_version(uuid, jsonb) to authenticated;
grant execute on function public.register_submission_file(uuid, public.file_kind, text, bigint, text) to authenticated;
grant execute on function public.set_file_scan_status(uuid, public.scan_status) to service_role;
grant execute on function public.submit_version(uuid, text) to authenticated;
