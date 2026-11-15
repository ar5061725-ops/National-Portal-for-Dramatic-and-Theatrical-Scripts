-- الدفعة 01 (الأوامر 004–009): المخططات، الأنواع، المنح الافتراضية، الإعدادات، مفاتيح التكرار.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

-- 004: لا منح تلقائية للأدوار العامة على ما سيُنشأ لاحقاً (كل منحة تُكتب صراحة)
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema app_private revoke all on tables from public, anon, authenticated;
alter default privileges in schema app_private revoke execute on functions from public, anon, authenticated;

-- 005: الأنواع والحالات (القاعدة ترفض القيم غير المعروفة)
create type public.app_role as enum ('author', 'reviewer', 'committee_manager', 'producer', 'finance', 'content_admin', 'support');
create type public.profile_status as enum ('active', 'suspended');
create type public.work_type as enum ('play', 'series', 'film');
create type public.submission_status as enum ('draft', 'awaiting_payment', 'received', 'in_review', 'revision_requested', 'approved', 'rejected');
create type public.file_kind as enum ('executive', 'treatment', 'author_profile', 'script');
create type public.file_audience as enum ('author', 'committee');
create type public.scan_status as enum ('pending', 'clean', 'rejected');
create type public.assignment_status as enum ('active', 'completed', 'declined', 'expired');
create type public.review_recommendation as enum ('approve', 'revise', 'reject');
create type public.decision_outcome as enum ('approved', 'revision_requested', 'rejected');
create type public.producer_verification as enum ('pending', 'verified', 'rejected');
create type public.producer_request_status as enum ('pending', 'accepted', 'declined', 'withdrawn');
create type public.ticket_state as enum ('open', 'pending', 'resolved', 'closed');

create type app_private.provider_env as enum ('sandbox', 'production');
create type app_private.payment_state as enum ('creating', 'pending', 'paid', 'failed', 'expired', 'partially_refunded', 'refunded');
create type app_private.event_process_state as enum ('received', 'processing', 'processed', 'deferred', 'quarantined');
create type app_private.refund_state as enum ('requested', 'approved', 'submitted', 'confirmed', 'failed', 'cancelled');
create type app_private.reconciliation_state as enum ('open', 'resolved');
create type app_private.email_state as enum ('pending', 'sending', 'sent', 'failed', 'dead');

-- محدّث وقت التعديل
create function app_private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- 008: بيانات مرجعية وإعدادات تشغيل
create table public.work_genres (
  code text primary key check (code ~ '^[a-z_]+$'),
  title_ar text not null,
  work_type public.work_type,          -- null = ينطبق على كل الأنواع
  active boolean not null default true
);

create table public.app_settings (
  setting_key text primary key check (setting_key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  -- القاعدة ترفض قيمة خارج النوع المعتمد لكل إعداد
  constraint app_settings_value_type check (
    case setting_key
      when 'submissions_open' then jsonb_typeof(value) = 'boolean'
      when 'film_enabled' then jsonb_typeof(value) = 'boolean'
      when 'fees_enabled' then jsonb_typeof(value) = 'boolean'
      when 'review_sla_days' then jsonb_typeof(value) = 'number'
      when 'review_reminder_days' then jsonb_typeof(value) = 'number'
      else true
    end
  )
);
create trigger app_settings_touch before update on public.app_settings
  for each row execute function app_private.touch_updated_at();

insert into public.work_genres (code, title_ar, work_type) values
  ('mystery', 'غموض', null), ('crime', 'جريمة', null), ('thriller', 'تشويق', null),
  ('psych', 'نفسي', null), ('mono', 'مونودراما', 'play'), ('social', 'اجتماعي', null);

insert into public.app_settings (setting_key, value) values
  ('submissions_open', 'true'::jsonb),     -- 093: علم إيقاف التقديم عند العطل الشديد
  ('film_enabled', 'false'::jsonb),        -- نطاق النسخة الأولى: دراما ومسرح
  ('fees_enabled', 'false'::jsonb),        -- 092: التحصيل مرتبط بإعداد مؤسسي معتمد
  ('review_sla_days', '14'::jsonb),        -- 098: مهلة المراجعة
  ('review_reminder_days', '10'::jsonb);

-- 009: مفاتيح تكرار العمليات
create table app_private.request_idempotency (
  actor_id uuid not null,
  operation text not null,
  idem_key text not null check (length(idem_key) between 8 and 128),
  request_hash text not null,
  result_min jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 days',
  primary key (actor_id, operation, idem_key)
);
create index request_idempotency_expires on app_private.request_idempotency (expires_at);

-- قفل استشاري يمنع تكرار الطلبات المتزامنة بالمفتاح نفسه
create function app_private.idem_lock(p_actor uuid, p_op text, p_key text) returns void
language sql set search_path = '' as $$
  select pg_advisory_xact_lock(hashtextextended(p_actor::text || '|' || p_op || '|' || p_key, 0));
$$;

-- RLS: الإعدادات والتصنيفات
alter table public.work_genres enable row level security;
alter table public.app_settings enable row level security;
alter table app_private.request_idempotency enable row level security;

revoke all on public.work_genres, public.app_settings from anon, authenticated;
grant select on public.work_genres to anon, authenticated;
create policy work_genres_read_active on public.work_genres for select to anon, authenticated using (active);

-- الواجهة تقرأ الإعدادات المسموحة فقط عبر هذه الدالة
create function public.get_public_settings() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(setting_key, value), '{}'::jsonb)
  from public.app_settings
  where setting_key in ('submissions_open', 'film_enabled', 'fees_enabled');
$$;
revoke execute on function public.get_public_settings() from public;
grant execute on function public.get_public_settings() to anon, authenticated;
