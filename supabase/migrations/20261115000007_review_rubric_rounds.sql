-- الدفعة 07: آلية تقييم النصوص كما في ملحق «آلية تقييم النصوص».
-- نموذج معايير موزون، جولات تقييم، مراجعان مستقلان + مراجع ثالث للتحكيم، فصل الاعتماد عن النشر، لقطة نشر للمؤلف.
-- الأوزان والحدود إعدادات مقترحة للتجربة وتعتمدها الجهة قبل الاستخدام الرسمي.

-- ───────── نماذج التقييم: rubric_versions / rubric_criteria ─────────
create table public.rubric_versions (
  id uuid primary key default gen_random_uuid(),
  work_type public.work_type not null,
  version_no int not null check (version_no >= 1),
  effective_at timestamptz,                       -- null = غير مفعّل بعد
  policy_config jsonb not null,
  created_at timestamptz not null default now(),
  unique (work_type, version_no),
  constraint rubric_policy_valid check (coalesce(
    (policy_config ->> 'approve_min')::numeric between 0 and 100
    and (policy_config ->> 'revise_min')::numeric between 0 and 100
    and (policy_config ->> 'revise_min')::numeric < (policy_config ->> 'approve_min')::numeric
    and (policy_config ->> 'gap_threshold')::numeric between 0 and 100
    and (policy_config ->> 'initial_reviewers')::int between 1 and 5, false))
);

create table public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_version_id uuid not null references public.rubric_versions (id) on delete cascade,
  criterion_key text not null check (criterion_key ~ '^[a-z_]+$'),
  title text not null,
  description text not null default '',
  weight int not null check (weight > 0 and weight <= 100),
  display_order int not null,
  unique (rubric_version_id, criterion_key),
  unique (id, rubric_version_id)
);

-- النموذج المفعّل لا يتغير؛ إصدار جديد يُنشأ بدلاً من تعديله
create function app_private.guard_active_rubric() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_version uuid := coalesce(new.rubric_version_id, old.rubric_version_id);
begin
  if exists (select 1 from public.rubric_versions where id = v_version and effective_at is not null) then
    raise exception 'rubric_version_is_active' using errcode = '55000';
  end if;
  return coalesce(new, old);
end $$;
create trigger rubric_criteria_guard before insert or update or delete on public.rubric_criteria
  for each row execute function app_private.guard_active_rubric();

-- ───────── جولات التقييم ─────────
create type public.round_status as enum ('collecting', 'arbitration', 'awaiting_decision', 'decided', 'published', 'cancelled');

create table public.review_rounds (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  version_id uuid not null,
  rubric_version_id uuid not null references public.rubric_versions (id),   -- تبقى الجولة مرتبطة بإصدار بدأت به
  status public.round_status not null default 'collecting',
  aggregate_score numeric(7, 3) check (aggregate_score is null or (aggregate_score >= 0 and aggregate_score <= 100)),
  recommended_outcome public.decision_outcome,
  opened_at timestamptz not null default now(),
  due_at timestamptz,
  closed_at timestamptz,
  foreign key (version_id, submission_id) references public.submission_versions (id, submission_id)
);
-- جولة نشطة واحدة لكل إصدار
create unique index review_rounds_one_active on public.review_rounds (version_id) where status in ('collecting', 'arbitration', 'awaiting_decision', 'decided');

alter table public.review_assignments
  add column round_id uuid references public.review_rounds (id),
  add column acknowledged_at timestamptz,
  add column is_arbitration boolean not null default false;
create unique index review_assignments_one_per_round on public.review_assignments (round_id, reviewer_id) where status in ('active', 'completed');

-- ───────── التقييمات والدرجات ─────────
drop policy reviews_read_own on public.reviews;
drop policy notes_reviewer_read on public.review_notes;
alter table public.reviews drop constraint reviews_score_check;
alter table public.reviews drop column criteria_scores;
alter table public.reviews alter column score type numeric(7, 3);
alter table public.reviews add constraint reviews_score_range check (score is null or (score >= 0 and score <= 100));
alter table public.reviews add column rubric_version_id uuid references public.rubric_versions (id);

create table public.review_scores (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  criterion_id uuid not null references public.rubric_criteria (id),
  score int not null check (score between 0 and 10),
  rationale text not null default '' check (length(rationale) <= 1000),
  locator text check (locator is null or length(locator) <= 120),
  unique (review_id, criterion_id)
);

-- ملاحظات: المراجع «يقترح» عرضها، والمشرف يعتمد النشر
alter table public.review_notes
  add column proposed_for_author boolean not null default false,
  add column requires_revision boolean not null default false,
  add column required_action text check (required_action is null or length(required_action) <= 1000),
  add column completion_criterion text check (completion_criterion is null or length(completion_criterion) <= 1000);
-- visible_to_author تعني الآن «نُشرت للمؤلف»

create table public.review_report_files (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id),
  object_key text not null unique,
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid not null references public.profiles (id),
  scan_status public.scan_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ───────── القرار: اعتماد ثم نشر ─────────
drop policy decisions_read on public.decisions;
alter table public.decisions rename column reason to internal_reason;
alter table public.decisions rename column decided_by to approved_by;
alter table public.decisions rename column decided_at to approved_at;
alter table public.decisions drop constraint decisions_reason_check;
alter table public.decisions alter column internal_reason drop not null;
alter table public.decisions
  add column round_id uuid unique references public.review_rounds (id),
  add column recommended_outcome public.decision_outcome not null,
  add column aggregate_score numeric(7, 3) not null check (aggregate_score >= 0 and aggregate_score <= 100),
  add column author_reason text not null check (length(trim(author_reason)) between 3 and 2000);
-- سبب أي قرار يختلف عن التوصية يُثبت إلزامياً
alter table public.decisions add constraint decision_internal_reason_when_differs
  check (outcome = recommended_outcome or length(trim(coalesce(internal_reason, ''))) >= 3);

create table public.decision_publications (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions (id),
  revision_no int not null default 1 check (revision_no >= 1),
  published_at timestamptz not null default now(),
  published_by uuid not null references public.profiles (id),
  supersedes_id uuid references public.decision_publications (id),
  correction_reason text,
  public_snapshot jsonb not null,
  unique (decision_id, revision_no),
  constraint publication_correction check (revision_no = 1 or (supersedes_id is not null and length(trim(coalesce(correction_reason, ''))) >= 3))
);

-- ───────── RLS ─────────
alter table public.rubric_versions enable row level security;
alter table public.rubric_criteria enable row level security;
alter table public.review_rounds enable row level security;
alter table public.review_scores enable row level security;
alter table public.review_report_files enable row level security;
alter table public.decision_publications enable row level security;
revoke all on public.rubric_versions, public.rubric_criteria, public.review_rounds, public.review_scores,
  public.review_report_files, public.decision_publications from anon, authenticated;

-- المعايير منشورة للجميع (النماذج المفعّلة فقط)
grant select on public.rubric_versions, public.rubric_criteria to anon, authenticated;
create policy rubric_versions_public on public.rubric_versions for select to anon, authenticated using (effective_at is not null);
create policy rubric_criteria_public on public.rubric_criteria for select to anon, authenticated
  using (exists (select 1 from public.rubric_versions v where v.id = rubric_version_id and v.effective_at is not null));

-- المراجع يقرأ تقييمه هو فقط (لا مسودات الزملاء)
create function app_private.owns_review(p_review uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reviews r join public.review_assignments a on a.id = r.assignment_id
    where r.id = p_review and a.reviewer_id = (select auth.uid()) and a.status in ('active', 'completed')
      and app_private.has_role(a.reviewer_id, 'reviewer')
  );
$$;
grant execute on function app_private.owns_review(uuid) to authenticated, service_role;
grant select on public.reviews, public.review_scores, public.review_notes to authenticated;
create policy reviews_read_own on public.reviews for select to authenticated using (app_private.owns_review(id));
create policy review_scores_read_own on public.review_scores for select to authenticated using (app_private.owns_review(review_id));
create policy notes_reviewer_read on public.review_notes for select to authenticated using (app_private.owns_review(review_id));
-- القرار غير المنشور مرئي للمشرفين فقط؛ المؤلف يقرأ اللقطة المنشورة عبر get_published_result
grant select on public.decisions to authenticated;
create policy decisions_manager_read on public.decisions for select to authenticated using (app_private.has_role((select auth.uid()), 'committee_manager'));

-- ───────── مساعدات الحساب ─────────
create function app_private.outcome_for(p_score numeric, p_policy jsonb) returns public.decision_outcome
language sql immutable set search_path = '' as $$
  select case
    when p_score >= (p_policy ->> 'approve_min')::numeric then 'approved'
    when p_score >= (p_policy ->> 'revise_min')::numeric then 'revision_requested'
    else 'rejected' end::public.decision_outcome;
$$;

-- درجة المراجع من 100 = مجموع (درجة المعيار ÷ 10 × وزنه)، بدقة كاملة
create function app_private.review_total(p_review uuid) returns numeric
language sql stable set search_path = '' as $$
  select coalesce(sum(rs.score * c.weight), 0)::numeric / 10
  from public.review_scores rs join public.rubric_criteria c on c.id = rs.criterion_id
  where rs.review_id = p_review;
$$;

create function app_private.current_rubric(p_work_type public.work_type) returns public.rubric_versions
language sql stable set search_path = '' as $$
  select v from public.rubric_versions v
  where v.work_type = p_work_type and v.effective_at is not null and v.effective_at <= now()
  order by v.version_no desc limit 1;
$$;

-- التجميع: متوسط مراجعين مستقلين، أو الوسيط بعد الثالث عند فرق كبير أو اختلاف التوصية
create function app_private.refresh_round(p_round uuid) returns void
language plpgsql set search_path = '' as $$
declare
  r public.review_rounds;
  pol jsonb;
  init int;
  gap numeric;
  n int;
  v_max numeric; v_min numeric; v_recs int;
  v_agg numeric;
begin
  select * into r from public.review_rounds where id = p_round for update;
  if not found or r.status not in ('collecting', 'arbitration') then return; end if;
  select policy_config into pol from public.rubric_versions where id = r.rubric_version_id;
  init := (pol ->> 'initial_reviewers')::int;
  gap := (pol ->> 'gap_threshold')::numeric;

  select count(*), max(rv.score), min(rv.score), count(distinct rv.recommendation)
  into n, v_max, v_min, v_recs
  from public.reviews rv join public.review_assignments a on a.id = rv.assignment_id
  where a.round_id = p_round and rv.submitted_at is not null;

  if n < init then return; end if;
  if n = init and (v_max - v_min >= gap or v_recs > 1) then
    update public.review_rounds set status = 'arbitration' where id = p_round;   -- يُعيَّن مراجع ثالث
    return;
  end if;
  if n = init then
    select round(avg(rv.score), 3) into v_agg
    from public.reviews rv join public.review_assignments a on a.id = rv.assignment_id
    where a.round_id = p_round and rv.submitted_at is not null;
  else
    select round((percentile_cont(0.5) within group (order by rv.score))::numeric, 3) into v_agg   -- الوسيط
    from public.reviews rv join public.review_assignments a on a.id = rv.assignment_id
    where a.round_id = p_round and rv.submitted_at is not null;
  end if;
  update public.review_rounds
  set status = 'awaiting_decision', aggregate_score = v_agg, recommended_outcome = app_private.outcome_for(v_agg, pol)
  where id = p_round;
end $$;

-- ───────── تفعيل نموذج التقييم (مجموع الأوزان 100) ─────────
create function public.activate_rubric_version(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_total int;
begin
  if v_uid is null or not (app_private.has_role(v_uid, 'committee_manager') or app_private.has_role(v_uid, 'content_admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(sum(weight), 0) into v_total from public.rubric_criteria where rubric_version_id = p_id;
  if v_total <> 100 then raise exception 'weights_must_sum_100: %', v_total using errcode = '23514'; end if;
  update public.rubric_versions set effective_at = now() where id = p_id and effective_at is null;
  perform app_private.audit(v_uid, 'activate_rubric_version', 'rubric_version', p_id);
end $$;

-- ───────── بذور النموذج الأول لكل نوع عمل ─────────
do $$
declare
  v_type public.work_type;
  v_id uuid;
begin
  foreach v_type in array enum_range(null::public.work_type) loop
    insert into public.rubric_versions (work_type, version_no, policy_config)
    values (v_type, 1, '{"initial_reviewers":2,"gap_threshold":15,"approve_min":80,"revise_min":65,"scale_max":10}'::jsonb)
    returning id into v_id;
    insert into public.rubric_criteria (rubric_version_id, criterion_key, title, description, weight, display_order) values
      (v_id, 'idea_originality', 'الفكرة والأصالة', 'وضوح فرضية العمل وتميز زاويته وقدرته على توليد أحداث', 15, 1),
      (v_id, 'dramatic_structure', 'البناء الدرامي', 'ترابط الأحداث والتصعيد والسببية وتماسك البداية والنهاية', 20, 2),
      (v_id, 'characters', 'الشخصيات وأقواسها', 'الدوافع والتغير وتمايز الشخصيات وأثرها في الحبكة', 15, 3),
      (v_id, 'dialogue', 'الحوار', 'تميّز الأصوات ووظيفة الحوار وملاءمته للشخصيات والموقف', 10, 4),
      (v_id, 'rhythm_suspense', 'الإيقاع والتشويق', 'وظيفة المشاهد وتوزيع التحولات وإدارة التوتر', 15, 5),
      (v_id, 'staging', case when v_type = 'play' then 'التكوين المسرحي' else 'التكوين البصري' end,
        case when v_type = 'play' then 'قوة الفعل الدرامي والفضاء المسرحي' else 'قوة الفعل الدرامي والصورة' end, 10, 6),
      (v_id, 'world_genre', 'تماسك العالم وملاءمة النوع', 'اتساق قواعد العالم واللغة والوعود التي يقدمها العمل لجمهوره', 10, 7),
      (v_id, 'execution_maturity', 'النضج التنفيذي', 'وضوح المواد التنفيذية واتساقها مع العمل ضمن نطاق التقييم', 5, 8);
    update public.rubric_versions set effective_at = now() where id = v_id;
  end loop;
end $$;

-- ───────── دوال تُستبدل بالنسخة الجديدة ─────────
drop function public.get_review_queue();
drop function public.assign_review(uuid, uuid, timestamptz);
drop function public.save_review(uuid, jsonb, public.review_recommendation, jsonb, boolean);
drop function public.record_decision(uuid, public.decision_outcome, text);

-- ───────── التوزيع ─────────
create function public.assign_review(p_version_id uuid, p_reviewer_id uuid, p_due_at timestamptz default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.submissions;
  v_ver public.submission_versions;
  v_round public.review_rounds;
  v_rubric public.rubric_versions;
  v_init int;
  v_count int;
  v_due timestamptz;
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

  v_due := coalesce(p_due_at, now() + make_interval(days => coalesce((select (value #>> '{}')::int from public.app_settings where setting_key = 'review_sla_days'), 14)));
  select * into v_round from public.review_rounds
  where version_id = p_version_id and status in ('collecting', 'arbitration', 'awaiting_decision', 'decided') for update;
  if not found then
    v_rubric := app_private.current_rubric(v_ver.work_type);
    if v_rubric.id is null then raise exception 'no_active_rubric' using errcode = '55000'; end if;
    insert into public.review_rounds (submission_id, version_id, rubric_version_id, due_at)
    values (v_sub.id, p_version_id, v_rubric.id, v_due) returning * into v_round;
  end if;
  if v_round.status not in ('collecting', 'arbitration') then raise exception 'round_closed_for_assignment' using errcode = '55000'; end if;

  select (policy_config ->> 'initial_reviewers')::int into v_init from public.rubric_versions where id = v_round.rubric_version_id;
  select count(*) into v_count from public.review_assignments where round_id = v_round.id and status in ('active', 'completed');
  -- مراجعان مستقلان؛ الثالث فقط عند التحكيم
  if v_count >= v_init + (case when v_round.status = 'arbitration' then 1 else 0 end) then
    raise exception 'reviewer_limit_reached' using errcode = '55000';
  end if;

  insert into public.review_assignments (version_id, round_id, reviewer_id, assigned_by, due_at, is_arbitration)
  values (p_version_id, v_round.id, p_reviewer_id, v_uid, v_due, v_round.status = 'arbitration') returning id into v_id;

  if v_sub.status = 'received' then
    perform app_private.transition_submission(v_sub.id, 'in_review', v_uid, 'assigned');
  end if;
  perform app_private.audit(v_uid, 'assign_review', 'review_assignment', v_id, jsonb_build_object('round_id', v_round.id, 'arbitration', v_round.status = 'arbitration'));
  return v_id;
end $$;

-- ───────── قائمة المراجع (معماة) وإقرار عدم التعارض ─────────
create function public.get_review_queue() returns table (
  assignment_id uuid, round_id uuid, version_id uuid, public_no text, work_type public.work_type, genre_codes text[],
  logline text, episodes_count int, acts_count int, duration_minutes int, due_at timestamptz, version_no int,
  acknowledged boolean, is_arbitration boolean, has_draft boolean
) language sql stable security definer set search_path = '' as $$
  select a.id, a.round_id, v.id, s.public_no, v.work_type, v.genre_codes, v.logline, v.episodes_count, v.acts_count,
         v.duration_minutes, a.due_at, v.version_no, a.acknowledged_at is not null, a.is_arbitration,
         exists (select 1 from public.reviews r where r.assignment_id = a.id)
  from public.review_assignments a
  join public.submission_versions v on v.id = a.version_id
  join public.submissions s on s.id = v.submission_id
  where a.reviewer_id = auth.uid() and a.status = 'active' and not a.conflict_declared
    and app_private.has_role(auth.uid(), 'reviewer')
  order by a.assigned_at;
$$;

create function public.acknowledge_no_conflict(p_assignment_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  update public.review_assignments set acknowledged_at = coalesce(acknowledged_at, now())
  where id = p_assignment_id and reviewer_id = auth.uid() and status = 'active' and not conflict_declared
    and app_private.has_role(auth.uid(), 'reviewer');
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

-- نموذج التقييم لمراجع معيَّن: المعايير والأوزان + مسودته هو فقط
create function public.get_review_form(p_assignment_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_a public.review_assignments;
  v_round public.review_rounds;
  v_review public.reviews;
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select * into v_a from public.review_assignments where id = p_assignment_id;
  if not found or v_a.reviewer_id <> auth.uid() or v_a.status <> 'active' or v_a.conflict_declared
     or not app_private.has_role(auth.uid(), 'reviewer') then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_a.acknowledged_at is null then raise exception 'conflict_ack_required' using errcode = '55000'; end if;
  select * into v_round from public.review_rounds where id = v_a.round_id;
  select * into v_review from public.reviews where assignment_id = p_assignment_id;
  return jsonb_build_object(
    'assignment_id', p_assignment_id,
    'round_id', v_round.id,
    'rubric', (select jsonb_build_object('version_no', rv.version_no, 'policy', rv.policy_config,
                 'criteria', (select jsonb_agg(jsonb_build_object('key', c.criterion_key, 'title', c.title, 'description', c.description,
                                                                  'weight', c.weight) order by c.display_order)
                              from public.rubric_criteria c where c.rubric_version_id = rv.id))
               from public.rubric_versions rv where rv.id = v_round.rubric_version_id),
    'draft', case when v_review.id is null then null else jsonb_build_object(
      'recommendation', v_review.recommendation,
      'scores', (select coalesce(jsonb_agg(jsonb_build_object('criterion_key', c.criterion_key, 'score', rs.score, 'rationale', rs.rationale, 'locator', rs.locator)), '[]'::jsonb)
                 from public.review_scores rs join public.rubric_criteria c on c.id = rs.criterion_id where rs.review_id = v_review.id),
      'notes', (select coalesce(jsonb_agg(jsonb_build_object('locator', n.locator, 'body', n.body, 'proposed_for_author', n.proposed_for_author,
                         'requires_revision', n.requires_revision, 'required_action', n.required_action, 'completion_criterion', n.completion_criterion)), '[]'::jsonb)
                from public.review_notes n where n.review_id = v_review.id)) end
  );
end $$;

-- ───────── حفظ مسودة التقييم ─────────
create function public.save_review(p_assignment_id uuid, p_scores jsonb, p_recommendation public.review_recommendation, p_notes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_a public.review_assignments;
  v_round public.review_rounds;
  v_review public.reviews;
  v_item jsonb;
  v_crit public.rubric_criteria;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select * into v_a from public.review_assignments where id = p_assignment_id for update;
  if not found or v_a.reviewer_id <> v_uid or v_a.status <> 'active' or v_a.conflict_declared
     or not app_private.has_role(v_uid, 'reviewer') then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_a.acknowledged_at is null then raise exception 'conflict_ack_required' using errcode = '55000'; end if;
  select * into v_round from public.review_rounds where id = v_a.round_id;
  if v_round.status not in ('collecting', 'arbitration') then raise exception 'round_closed' using errcode = '55000'; end if;

  insert into public.reviews (assignment_id, rubric_version_id) values (p_assignment_id, v_round.rubric_version_id)
  on conflict (assignment_id) do nothing;
  select * into v_review from public.reviews where assignment_id = p_assignment_id for update;
  if v_review.submitted_at is not null then raise exception 'review_locked' using errcode = '55000'; end if;

  if p_scores is not null and jsonb_typeof(p_scores) = 'array' then
    for v_item in select * from jsonb_array_elements(p_scores) loop
      -- المعيار يجب أن ينتمي لنموذج الجولة
      select * into v_crit from public.rubric_criteria
      where rubric_version_id = v_round.rubric_version_id and criterion_key = v_item ->> 'criterion_key';
      if not found then raise exception 'criterion_not_in_rubric' using errcode = '22023'; end if;
      insert into public.review_scores (review_id, criterion_id, score, rationale, locator)
      values (v_review.id, v_crit.id, (v_item ->> 'score')::int, left(coalesce(v_item ->> 'rationale', ''), 1000), left(nullif(v_item ->> 'locator', ''), 120))
      on conflict (review_id, criterion_id) do update
        set score = excluded.score, rationale = excluded.rationale, locator = excluded.locator;
    end loop;
  end if;

  update public.reviews set recommendation = p_recommendation where id = v_review.id;
  if p_notes is not null and jsonb_typeof(p_notes) = 'array' then
    if jsonb_array_length(p_notes) > 50 then raise exception 'too_many_notes' using errcode = '22023'; end if;
    delete from public.review_notes where review_id = v_review.id;
    for v_item in select * from jsonb_array_elements(p_notes) loop
      insert into public.review_notes (review_id, locator, body, proposed_for_author, requires_revision, required_action, completion_criterion)
      values (v_review.id, left(coalesce(nullif(v_item ->> 'locator', ''), 'عام'), 120), left(v_item ->> 'body', 2000),
              coalesce((v_item ->> 'proposed_for_author')::boolean, false), coalesce((v_item ->> 'requires_revision')::boolean, false),
              left(v_item ->> 'required_action', 1000), left(v_item ->> 'completion_criterion', 1000));
    end loop;
  end if;
  return jsonb_build_object('status', 'draft', 'partial_total', app_private.review_total(v_review.id));
end $$;

-- ───────── إرسال التقييم (يُقفل) ─────────
create function public.submit_review(p_assignment_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_a public.review_assignments;
  v_review public.reviews;
  v_total numeric;
  v_expected int;
  v_done int;
  v_status public.round_status;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select * into v_a from public.review_assignments where id = p_assignment_id for update;
  if not found or v_a.reviewer_id <> v_uid or v_a.status <> 'active' or v_a.conflict_declared
     or not app_private.has_role(v_uid, 'reviewer') then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_a.acknowledged_at is null then raise exception 'conflict_ack_required' using errcode = '55000'; end if;
  select * into v_review from public.reviews where assignment_id = p_assignment_id for update;
  if not found then raise exception 'review_incomplete' using errcode = '23514'; end if;
  if v_review.submitted_at is not null then raise exception 'review_locked' using errcode = '55000'; end if;

  select count(*) into v_expected from public.rubric_criteria where rubric_version_id = v_review.rubric_version_id;
  select count(*) into v_done from public.review_scores where review_id = v_review.id and length(trim(rationale)) >= 3;
  if v_done <> v_expected or v_review.recommendation is null then
    raise exception 'review_incomplete: % of % criteria', v_done, v_expected using errcode = '23514';
  end if;

  v_total := app_private.review_total(v_review.id);
  update public.reviews set score = v_total, submitted_at = now() where id = v_review.id;
  update public.review_assignments set status = 'completed' where id = p_assignment_id;
  perform app_private.refresh_round(v_a.round_id);
  select status into v_status from public.review_rounds where id = v_a.round_id;
  perform app_private.audit(v_uid, 'submit_review', 'review', v_review.id);
  return jsonb_build_object('score', v_total, 'round_status', v_status);
end $$;

-- ───────── لوحة المشرف: تقييمات معماة + الدرجة المحسوبة + التعارضات ─────────
create function public.get_manager_rounds() returns table (
  round_id uuid, public_no text, status public.round_status, submitted_count int, aggregate_score numeric,
  recommended_outcome public.decision_outcome, due_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select r.id, s.public_no, r.status,
         (select count(*)::int from public.reviews rv join public.review_assignments a on a.id = rv.assignment_id
          where a.round_id = r.id and rv.submitted_at is not null),
         r.aggregate_score, r.recommended_outcome, r.due_at
  from public.review_rounds r join public.submissions s on s.id = r.submission_id
  where app_private.has_role(auth.uid(), 'committee_manager') and r.status in ('collecting', 'arbitration', 'awaiting_decision', 'decided')
  order by r.opened_at;
$$;

create function public.get_round_summary(p_round_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_round public.review_rounds;
  v_pol jsonb;
  v_sub public.submissions;
begin
  if auth.uid() is null or not app_private.has_role(auth.uid(), 'committee_manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_round from public.review_rounds where id = p_round_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select policy_config into v_pol from public.rubric_versions where id = v_round.rubric_version_id;
  select * into v_sub from public.submissions where id = v_round.submission_id;
  return jsonb_build_object(
    'round_id', v_round.id, 'public_no', v_sub.public_no, 'status', v_round.status,
    'aggregate_score', v_round.aggregate_score, 'recommended_outcome', v_round.recommended_outcome, 'policy', v_pol,
    'decision_id', (select d.id from public.decisions d where d.round_id = v_round.id),
    'reviews', (select coalesce(jsonb_agg(jsonb_build_object(
        'assignment_id', a.id, 'label', 'مراجع ' || a.rn, 'status', a.status, 'is_arbitration', a.is_arbitration,
        'conflict_declared', a.conflict_declared, 'score', rv.score, 'recommendation', rv.recommendation,
        'submitted', rv.submitted_at is not null) order by a.rn), '[]'::jsonb)
      from (select x.*, row_number() over (order by x.assigned_at) rn from public.review_assignments x where x.round_id = v_round.id) a
      left join public.reviews rv on rv.assignment_id = a.id)
  );
end $$;

-- ───────── اعتماد القرار (لا نشر) ─────────
create function public.record_decision(p_round_id uuid, p_outcome public.decision_outcome, p_author_reason text, p_internal_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_round public.review_rounds;
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.has_role(v_uid, 'committee_manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_round from public.review_rounds where id = p_round_id for update;   -- يقفل صف الجولة
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_round.status <> 'awaiting_decision' then
    raise exception 'round_not_ready: %', v_round.status using errcode = '55000';     -- يمنع الاعتماد قبل اكتمال التحكيم
  end if;
  if exists (select 1 from public.review_assignments a where a.round_id = p_round_id and a.reviewer_id = v_uid)
     or exists (select 1 from public.submissions s where s.id = v_round.submission_id and s.author_id = v_uid) then
    raise exception 'conflict_of_interest' using errcode = '42501';
  end if;
  insert into public.decisions (version_id, round_id, outcome, recommended_outcome, aggregate_score, approved_by, internal_reason, author_reason)
  values (v_round.version_id, p_round_id, p_outcome, v_round.recommended_outcome, v_round.aggregate_score, v_uid, p_internal_reason, p_author_reason)
  returning id into v_id;
  update public.review_rounds set status = 'decided' where id = p_round_id;
  perform app_private.audit(v_uid, 'record_decision', 'decision', v_id, jsonb_build_object('outcome', p_outcome, 'recommended', v_round.recommended_outcome));
  return v_id;
end $$;

-- المشرف يختار الملاحظات التي ستظهر للمؤلف قبل النشر
create function public.set_note_proposal(p_note_id uuid, p_proposed boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not app_private.has_role(auth.uid(), 'committee_manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.review_notes n set proposed_for_author = p_proposed
  where n.id = p_note_id and not n.visible_to_author;
  if not found then raise exception 'not_found_or_published' using errcode = 'P0002'; end if;
end $$;

-- ───────── نشر النتيجة للمؤلف (معاملة واحدة، مفتاح تكرار) ─────────
create function public.publish_review_result(p_decision_id uuid, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hash text := md5(p_decision_id::text);
  v_prev app_private.request_idempotency;
  v_dec public.decisions;
  v_round public.review_rounds;
  v_sub public.submissions;
  v_ver public.submission_versions;
  v_snapshot jsonb;
  v_pub_id uuid;
  v_status public.submission_status;
  v_result jsonb;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.has_role(v_uid, 'committee_manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  perform app_private.idem_lock(v_uid, 'publish_review_result', p_idempotency_key);
  select * into v_prev from app_private.request_idempotency
  where actor_id = v_uid and operation = 'publish_review_result' and idem_key = p_idempotency_key;
  if found then
    if v_prev.request_hash <> v_hash then raise exception 'idempotency_conflict' using errcode = '22023'; end if;
    return v_prev.result_min;   -- ضغط النشر مرتين = لقطة وإشعار واحد
  end if;

  select * into v_dec from public.decisions where id = p_decision_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.decision_publications where decision_id = p_decision_id) then
    raise exception 'already_published' using errcode = '55000';
  end if;
  select * into v_round from public.review_rounds where id = v_dec.round_id for update;
  select s.* into v_sub from public.submissions s where s.id = v_round.submission_id for update;
  select * into v_ver from public.submission_versions where id = v_dec.version_id;
  -- النشر مرتبط بالنسخة المعنية فقط
  if v_sub.current_version_id <> v_dec.version_id or v_sub.status <> 'in_review' then
    raise exception 'decision_not_publishable' using errcode = '55000';
  end if;

  update public.review_notes set visible_to_author = true
  where proposed_for_author and review_id in (
    select rv.id from public.reviews rv join public.review_assignments a on a.id = rv.assignment_id where a.round_id = v_round.id);

  v_snapshot := jsonb_build_object(
    'title', v_ver.title, 'version_no', v_ver.version_no, 'outcome', v_dec.outcome,
    'aggregate_score', round(v_dec.aggregate_score, 1), 'decided_at', v_dec.approved_at, 'author_reason', v_dec.author_reason,
    'notes', (select coalesce(jsonb_agg(jsonb_build_object('locator', n.locator, 'body', n.body, 'requires_revision', n.requires_revision,
                     'required_action', n.required_action, 'completion_criterion', n.completion_criterion) order by n.created_at), '[]'::jsonb)
              from public.review_notes n join public.reviews rv on rv.id = n.review_id join public.review_assignments a on a.id = rv.assignment_id
              where a.round_id = v_round.id and n.visible_to_author));
  insert into public.decision_publications (decision_id, published_by, public_snapshot) values (p_decision_id, v_uid, v_snapshot)
  returning id into v_pub_id;

  v_status := case v_dec.outcome when 'approved' then 'approved' when 'revision_requested' then 'revision_requested' else 'rejected' end;
  perform app_private.transition_submission(v_sub.id, v_status, v_uid, 'result_published');
  update public.review_rounds set status = 'published', closed_at = now() where id = v_round.id;
  if v_dec.outcome = 'approved' then
    insert into public.certificates (decision_id) values (p_decision_id) on conflict (decision_id) do nothing;
  end if;
  perform app_private.notify(v_sub.author_id, 'result:' || p_decision_id::text || ':1', 'decision_' || v_dec.outcome::text, v_sub.id);
  perform app_private.audit(v_uid, 'publish_review_result', 'decision', p_decision_id, jsonb_build_object('publication_id', v_pub_id));

  v_result := jsonb_build_object('publication_id', v_pub_id, 'submission_status', v_status);
  insert into app_private.request_idempotency (actor_id, operation, idem_key, request_hash, result_min)
  values (v_uid, 'publish_review_result', p_idempotency_key, v_hash, v_result);
  return v_result;
end $$;

-- تصحيح بعد النشر: لقطة جديدة بسبب موثّق (تعديل النص ينشئ إصداراً وجولة منفصلة)
create function public.correct_published_result(p_decision_id uuid, p_author_reason text, p_correction_reason text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hash text := md5(p_decision_id::text || p_author_reason);
  v_prev app_private.request_idempotency;
  v_last public.decision_publications;
  v_pub_id uuid;
  v_result jsonb;
  v_author uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.has_role(v_uid, 'committee_manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  if length(trim(coalesce(p_correction_reason, ''))) < 3 or length(trim(coalesce(p_author_reason, ''))) < 3 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  perform app_private.idem_lock(v_uid, 'correct_published_result', p_idempotency_key);
  select * into v_prev from app_private.request_idempotency
  where actor_id = v_uid and operation = 'correct_published_result' and idem_key = p_idempotency_key;
  if found then
    if v_prev.request_hash <> v_hash then raise exception 'idempotency_conflict' using errcode = '22023'; end if;
    return v_prev.result_min;
  end if;
  select * into v_last from public.decision_publications where decision_id = p_decision_id order by revision_no desc limit 1 for update;
  if not found then raise exception 'not_published' using errcode = '55000'; end if;

  update public.decisions set author_reason = p_author_reason where id = p_decision_id;
  insert into public.decision_publications (decision_id, revision_no, published_by, supersedes_id, correction_reason, public_snapshot)
  values (p_decision_id, v_last.revision_no + 1, v_uid, v_last.id, p_correction_reason,
          jsonb_set(v_last.public_snapshot, '{author_reason}', to_jsonb(p_author_reason)))
  returning id into v_pub_id;
  select s.author_id into v_author from public.decisions d join public.submission_versions v on v.id = d.version_id
    join public.submissions s on s.id = v.submission_id where d.id = p_decision_id;
  perform app_private.notify(v_author, 'result:' || p_decision_id::text || ':' || (v_last.revision_no + 1), 'result_corrected', null);
  perform app_private.audit(v_uid, 'correct_published_result', 'decision', p_decision_id, jsonb_build_object('revision_no', v_last.revision_no + 1));
  v_result := jsonb_build_object('publication_id', v_pub_id, 'revision_no', v_last.revision_no + 1);
  insert into app_private.request_idempotency (actor_id, operation, idem_key, request_hash, result_min)
  values (v_uid, 'correct_published_result', p_idempotency_key, v_hash, v_result);
  return v_result;
end $$;

-- المؤلف يقرأ آخر لقطة منشورة تخصه فقط
create function public.get_published_result(p_submission_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_pub public.decision_publications;
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not app_private.owns_submission(p_submission_id) then raise exception 'not_found' using errcode = 'P0002'; end if;
  select p.* into v_pub
  from public.decision_publications p
  join public.decisions d on d.id = p.decision_id
  join public.submission_versions v on v.id = d.version_id
  where v.submission_id = p_submission_id
  order by p.published_at desc, p.revision_no desc limit 1;
  if not found then return null; end if;
  return v_pub.public_snapshot || jsonb_build_object('published_at', v_pub.published_at, 'revision_no', v_pub.revision_no);
end $$;

-- تقرير اللجنة الورقي (اختياري، حاوية خاصة بصلاحية المشرف)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-reports-portal', 'review-reports-portal', false, 20971520, array['application/pdf']) on conflict (id) do nothing;
create policy review_reports_manager_read on storage.objects for select to authenticated
  using (bucket_id = 'review-reports-portal' and app_private.has_role((select auth.uid()), 'committee_manager'));

create function public.register_review_report(p_review_id uuid, p_object_key text, p_sha256 text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not app_private.has_role(auth.uid(), 'committee_manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.reviews where id = p_review_id) then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.review_report_files (review_id, object_key, sha256, uploaded_by) values (p_review_id, p_object_key, lower(p_sha256), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- الدرجة المعروضة في الدليل: الدرجة المجمّعة المعتمدة من 10
create or replace function public.public_catalog(p_work_type public.work_type default null, p_genre text default null, p_limit int default 20, p_offset int default 0)
returns table (slug text, public_title text, public_summary text, work_type public.work_type, genre_codes text[],
               author_name text, score numeric, published_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.slug, e.public_title, e.public_summary, v.work_type, v.genre_codes, p.full_name,
         (select round(d.aggregate_score / 10, 1) from public.decisions d where d.version_id = v.id),
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

-- ───────── منح التنفيذ ─────────
revoke execute on function public.activate_rubric_version(uuid) from public, anon;
revoke execute on function public.assign_review(uuid, uuid, timestamptz) from public, anon;
revoke execute on function public.get_review_queue() from public, anon;
revoke execute on function public.acknowledge_no_conflict(uuid) from public, anon;
revoke execute on function public.get_review_form(uuid) from public, anon;
revoke execute on function public.save_review(uuid, jsonb, public.review_recommendation, jsonb) from public, anon;
revoke execute on function public.submit_review(uuid) from public, anon;
revoke execute on function public.get_manager_rounds() from public, anon;
revoke execute on function public.get_round_summary(uuid) from public, anon;
revoke execute on function public.record_decision(uuid, public.decision_outcome, text, text) from public, anon;
revoke execute on function public.set_note_proposal(uuid, boolean) from public, anon;
revoke execute on function public.publish_review_result(uuid, text) from public, anon;
revoke execute on function public.correct_published_result(uuid, text, text, text) from public, anon;
revoke execute on function public.get_published_result(uuid) from public, anon;
revoke execute on function public.register_review_report(uuid, text, text) from public, anon;
grant execute on function public.activate_rubric_version(uuid) to authenticated;
grant execute on function public.assign_review(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.get_review_queue() to authenticated;
grant execute on function public.acknowledge_no_conflict(uuid) to authenticated;
grant execute on function public.get_review_form(uuid) to authenticated;
grant execute on function public.save_review(uuid, jsonb, public.review_recommendation, jsonb) to authenticated;
grant execute on function public.submit_review(uuid) to authenticated;
grant execute on function public.get_manager_rounds() to authenticated;
grant execute on function public.get_round_summary(uuid) to authenticated;
grant execute on function public.record_decision(uuid, public.decision_outcome, text, text) to authenticated;
grant execute on function public.set_note_proposal(uuid, boolean) to authenticated;
grant execute on function public.publish_review_result(uuid, text) to authenticated;
grant execute on function public.correct_published_result(uuid, text, text, text) to authenticated;
grant execute on function public.get_published_result(uuid) to authenticated;
grant execute on function public.register_review_report(uuid, text, text) to authenticated;
