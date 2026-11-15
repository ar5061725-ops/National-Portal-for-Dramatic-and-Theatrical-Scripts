-- الدفعة 04 (الأوامر 028–030، 033، 034): الدليل العام، المنتجون، المذكرة التعليمية، الدعم، إسقاطات عامة آمنة.

-- ───────── 028: catalog_entries ─────────
create table public.catalog_entries (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null unique references public.submission_versions (id),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  public_title text not null check (length(trim(public_title)) between 1 and 200),
  public_summary text not null check (length(trim(public_summary)) between 1 and 600),
  consent_at timestamptz not null default now(),
  published_at timestamptz,
  withdrawn_at timestamptz
);

-- ───────── 029: producer_requests ─────────
create table public.producer_requests (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.catalog_entries (id),
  producer_id uuid not null references public.profiles (id),
  purpose text not null check (length(trim(purpose)) between 10 and 1000),
  status public.producer_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index producer_requests_one_pending on public.producer_requests (entry_id, producer_id) where status = 'pending';

-- ───────── 030: موارد المذكرة التعليمية ─────────
create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  title text not null,
  author_name text not null,
  summary text not null,
  active_version_id uuid
);
create table public.resource_versions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.learning_resources (id) on delete cascade,
  version_no int not null check (version_no >= 1),
  object_key text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  published_by uuid references auth.users (id),
  published_at timestamptz,
  unique (resource_id, version_no),
  unique (id, resource_id)
);
-- المورد يرتبط بإصداره بمفتاح مركّب
alter table public.learning_resources
  add constraint learning_active_version_fk foreign key (active_version_id, id) references public.resource_versions (id, resource_id);

do $$
declare
  v_res uuid;
  v_ver uuid;
begin
  insert into public.learning_resources (slug, title, author_name, summary)
  values ('series-engineering', 'هندسة المسلسل وكتابة السيناريو', 'عبدالله العبدالله',
          'مذكرة تعليمية وإطار تجريبي للمراجعة والتقييم، من النص إلى الصورة.')
  returning id into v_res;
  insert into public.resource_versions (resource_id, version_no, object_key, sha256, published_at)
  values (v_res, 1, 'learning/series-engineering.pdf', 'c3e6ecc0b4fb0f221ec3b6ec84df1471a9cf1535c03bb98a87557b1cc62f727e', now())
  returning id into v_ver;
  update public.learning_resources set active_version_id = v_ver where id = v_res;
end $$;

-- ───────── 033: الدعم ─────────
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique default ('SUP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  owner_id uuid not null references public.profiles (id),
  submission_id uuid references public.submissions (id) on delete set null,
  category text not null check (category in ('payment', 'account', 'review', 'other')),
  state public.ticket_state not null default 'open',
  assignee_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger support_tickets_touch before update on public.support_tickets
  for each row execute function app_private.touch_updated_at();
create index support_tickets_owner on public.support_tickets (owner_id, created_at desc);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index support_messages_ticket on public.support_messages (ticket_id, created_at);

-- ───────── RLS ─────────
alter table public.catalog_entries enable row level security;
alter table public.producer_requests enable row level security;
alter table public.learning_resources enable row level security;
alter table public.resource_versions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.catalog_entries, public.producer_requests, public.learning_resources,
  public.resource_versions, public.support_tickets, public.support_messages from anon, authenticated;
grant select on public.catalog_entries, public.producer_requests, public.support_tickets, public.support_messages to authenticated;

create policy catalog_author_read on public.catalog_entries for select to authenticated using (app_private.owns_version(version_id));
create policy producer_requests_read on public.producer_requests for select to authenticated
  using (producer_id = (select auth.uid()) or app_private.owns_version((select version_id from public.catalog_entries where id = entry_id)));
create policy tickets_read on public.support_tickets for select to authenticated
  using (owner_id = (select auth.uid()) or app_private.has_role((select auth.uid()), 'support'));
create policy messages_read on public.support_messages for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id
                 and (t.owner_id = (select auth.uid()) or app_private.has_role((select auth.uid()), 'support'))));
-- موارد المذكرة: لا قراءة مباشرة؛ تُعرض عبر get_learning_resource فقط

-- ───────── 034: إسقاطات عامة (حقول مصرّح بها فقط) ─────────
create function app_private.entry_is_public(p_entry public.catalog_entries) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_entry.published_at is not null and p_entry.withdrawn_at is null and exists (
    select 1 from public.decisions d
    join public.certificates c on c.decision_id = d.id
    where d.version_id = p_entry.version_id and d.outcome = 'approved' and c.revoked_at is null
  );
$$;

create function public.public_catalog(p_work_type public.work_type default null, p_genre text default null, p_limit int default 20, p_offset int default 0)
returns table (slug text, public_title text, public_summary text, work_type public.work_type, genre_codes text[],
               author_name text, score numeric, published_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.slug, e.public_title, e.public_summary, v.work_type, v.genre_codes, p.full_name,
         (select round(avg(r.score), 1) from public.reviews r join public.review_assignments a on a.id = r.assignment_id
          where a.version_id = v.id and r.submitted_at is not null),
         e.published_at
  from public.catalog_entries e
  join public.submission_versions v on v.id = e.version_id
  join public.submissions s on s.id = v.submission_id
  join public.profiles p on p.id = s.author_id
  where app_private.entry_is_public(e)
    and (p_work_type is null or v.work_type = p_work_type)
    and (p_genre is null or p_genre = any (v.genre_codes))
  order by e.published_at desc
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;

create function public.get_catalog_entry(p_slug text)
returns table (slug text, public_title text, public_summary text, work_type public.work_type, genre_codes text[],
               author_name text, score numeric, published_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select * from public.public_catalog(null, null, 50, 0) c where c.slug = p_slug;
$$;

create function public.verify_certificate(p_code text)
returns table (status text, title text, author_name text, work_type public.work_type, issued_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select case when c.revoked_at is null then 'active' else 'revoked' end, v.title, p.full_name, v.work_type, c.issued_at
  from public.certificates c
  join public.decisions d on d.id = c.decision_id
  join public.submission_versions v on v.id = d.version_id
  join public.submissions s on s.id = v.submission_id
  join public.profiles p on p.id = s.author_id
  where c.verification_code = upper(trim(p_code));
$$;

create function public.get_learning_resource(p_slug text)
returns table (slug text, title text, author_name text, summary text, version_no int, object_key text, sha256 text, published_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.slug, r.title, r.author_name, r.summary, v.version_no, v.object_key, v.sha256, v.published_at
  from public.learning_resources r
  join public.resource_versions v on v.id = r.active_version_id and v.resource_id = r.id
  where r.slug = p_slug and v.published_at is not null;
$$;

-- ───────── 028: الإذن والنشر والسحب ─────────
create function public.set_publication_consent(p_version_id uuid, p_slug text, p_title text, p_summary text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.owns_version(p_version_id) then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not exists (
    select 1 from public.decisions d join public.certificates c on c.decision_id = d.id
    where d.version_id = p_version_id and d.outcome = 'approved' and c.revoked_at is null
  ) then raise exception 'no_active_certificate' using errcode = '55000'; end if;
  insert into public.catalog_entries (version_id, slug, public_title, public_summary)
  values (p_version_id, lower(p_slug), p_title, p_summary)
  on conflict (version_id) do update set public_title = excluded.public_title, public_summary = excluded.public_summary, withdrawn_at = null
  returning id into v_id;
  return v_id;
end $$;

create function public.publish_catalog_entry(p_entry_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_entry public.catalog_entries;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not (app_private.has_role(v_uid, 'committee_manager') or app_private.has_role(v_uid, 'content_admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_entry from public.catalog_entries where id = p_entry_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not exists (
    select 1 from public.decisions d join public.certificates c on c.decision_id = d.id
    where d.version_id = v_entry.version_id and d.outcome = 'approved' and c.revoked_at is null
  ) then raise exception 'no_active_certificate' using errcode = '55000'; end if;
  update public.catalog_entries set published_at = coalesce(published_at, now()), withdrawn_at = null where id = p_entry_id;
  perform app_private.audit(v_uid, 'publish_catalog_entry', 'catalog_entry', p_entry_id);
end $$;

create function public.withdraw_catalog_entry(p_entry_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_entry public.catalog_entries;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select * into v_entry from public.catalog_entries where id = p_entry_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not (app_private.owns_version(v_entry.version_id) or app_private.has_role(v_uid, 'committee_manager') or app_private.has_role(v_uid, 'content_admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.catalog_entries set withdrawn_at = coalesce(withdrawn_at, now()) where id = p_entry_id;
  perform app_private.audit(v_uid, 'withdraw_catalog_entry', 'catalog_entry', p_entry_id);
end $$;

-- ───────── 029: طلبات تواصل المنتجين ─────────
create function public.request_producer_contact(p_entry_id uuid, p_purpose text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_entry public.catalog_entries;
  v_author uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.has_role(v_uid, 'producer') or not exists (
    select 1 from public.producer_profiles pp where pp.user_id = v_uid and pp.verification_status = 'verified'
  ) then raise exception 'producer_not_verified' using errcode = '42501'; end if;
  select * into v_entry from public.catalog_entries where id = p_entry_id;
  if not found or not app_private.entry_is_public(v_entry) then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.producer_requests (entry_id, producer_id, purpose) values (p_entry_id, v_uid, p_purpose) returning id into v_id;
  select s.author_id into v_author from public.submission_versions v join public.submissions s on s.id = v.submission_id where v.id = v_entry.version_id;
  perform app_private.notify(v_author, 'producer_request:' || v_id::text, 'producer_request', null);
  return v_id;
end $$;

create function public.respond_to_producer_request(p_request_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_req public.producer_requests;
  v_version uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select * into v_req from public.producer_requests where id = p_request_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select version_id into v_version from public.catalog_entries where id = v_req.entry_id;
  if not app_private.owns_version(v_version) then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_req.status <> 'pending' then raise exception 'already_decided' using errcode = '55000'; end if;
  update public.producer_requests set status = case when p_accept then 'accepted' else 'declined' end::public.producer_request_status, decided_at = now()
  where id = p_request_id;
  perform app_private.notify(v_req.producer_id, 'producer_request_reply:' || p_request_id::text, 'producer_request_reply', null);
end $$;

-- الحد الأدنى من بيانات التواصل للمنتج، بعد موافقة الكاتب فقط
create function public.get_accepted_contact(p_request_id uuid) returns table (full_name text, email text, phone_e164 text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  return query
  select p.full_name, u.email::text, p.phone_e164
  from public.producer_requests r
  join public.catalog_entries e on e.id = r.entry_id
  join public.submission_versions v on v.id = e.version_id
  join public.submissions s on s.id = v.submission_id
  join public.profiles p on p.id = s.author_id
  join auth.users u on u.id = s.author_id
  where r.id = p_request_id and r.producer_id = v_uid and r.status = 'accepted' and app_private.entry_is_public(e);
end $$;

-- ───────── الدعم ─────────
create function public.open_support_ticket(p_category text, p_submission_id uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ticket public.support_tickets;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if p_submission_id is not null and not app_private.owns_submission(p_submission_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.support_tickets (owner_id, submission_id, category) values (v_uid, p_submission_id, p_category) returning * into v_ticket;
  insert into public.support_messages (ticket_id, sender_id, body) values (v_ticket.id, v_uid, p_body);
  return jsonb_build_object('ticket_id', v_ticket.id, 'ticket_no', v_ticket.ticket_no);
end $$;

create function public.add_support_message(p_ticket_id uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ticket public.support_tickets;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if not found or not (v_ticket.owner_id = v_uid or app_private.has_role(v_uid, 'support')) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.support_messages (ticket_id, sender_id, body) values (p_ticket_id, v_uid, p_body);
  update public.support_tickets
  set state = case when app_private.has_role(v_uid, 'support') then 'pending' else 'open' end::public.ticket_state
  where id = p_ticket_id and state <> 'closed';
end $$;

-- ───────── 007: منح التنفيذ ─────────
revoke execute on function public.public_catalog(public.work_type, text, int, int) from public;
revoke execute on function public.get_catalog_entry(text) from public;
revoke execute on function public.verify_certificate(text) from public;
revoke execute on function public.get_learning_resource(text) from public;
revoke execute on function public.set_publication_consent(uuid, text, text, text) from public, anon;
revoke execute on function public.publish_catalog_entry(uuid) from public, anon;
revoke execute on function public.withdraw_catalog_entry(uuid) from public, anon;
revoke execute on function public.request_producer_contact(uuid, text) from public, anon;
revoke execute on function public.respond_to_producer_request(uuid, boolean) from public, anon;
revoke execute on function public.get_accepted_contact(uuid) from public, anon;
revoke execute on function public.open_support_ticket(text, uuid, text) from public, anon;
revoke execute on function public.add_support_message(uuid, text) from public, anon;
grant execute on function public.public_catalog(public.work_type, text, int, int) to anon, authenticated;
grant execute on function public.get_catalog_entry(text) to anon, authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.get_learning_resource(text) to anon, authenticated;
grant execute on function public.set_publication_consent(uuid, text, text, text) to authenticated;
grant execute on function public.publish_catalog_entry(uuid) to authenticated;
grant execute on function public.withdraw_catalog_entry(uuid) to authenticated;
grant execute on function public.request_producer_contact(uuid, text) to authenticated;
grant execute on function public.respond_to_producer_request(uuid, boolean) to authenticated;
grant execute on function public.get_accepted_contact(uuid) to authenticated;
grant execute on function public.open_support_ticket(text, uuid, text) to authenticated;
grant execute on function public.add_support_message(uuid, text) to authenticated;
grant execute on function app_private.entry_is_public(public.catalog_entries) to authenticated, service_role;
