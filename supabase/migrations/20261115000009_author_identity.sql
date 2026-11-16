-- هوية المؤلف (من البطاقة المدنية): تُحفظ في جدول مغلق بسياسة RLS، ولا تبقى في بيانات حساب Auth.

create table public.author_identity (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  civil_id text not null unique check (civil_id ~ '^[23][0-9]{11}$'),
  birth_date date not null check (birth_date >= date '1900-01-01'),
  card_serial text not null check (card_serial ~ '^[0-9]{10}$'),
  nationality text not null check (length(trim(nationality)) between 2 and 40),
  area text not null check (length(trim(area)) between 1 and 60),
  block text not null check (length(trim(block)) between 1 and 10),
  street text not null check (length(trim(street)) between 1 and 60),
  building text not null check (length(trim(building)) between 1 and 20),
  floor text check (floor is null or length(floor) <= 10),
  unit text check (unit is null or length(unit) <= 20),
  paci_no text check (paci_no is null or paci_no ~ '^[0-9]{8}$'),
  created_at timestamptz not null default now()
);

alter table public.author_identity enable row level security;
revoke all on public.author_identity from anon, authenticated;
grant select on public.author_identity to authenticated;
create policy author_identity_read_own on public.author_identity for select to authenticated using (user_id = (select auth.uid()));

-- التحقق من الرقم المدني الكويتي: 12 رقماً، يبدأ بـ 2 (قبل 2000) أو 3، يتضمن تاريخ الميلاد YYMMDD، والرقم الأخير فحصي
create function app_private.kw_civil_id_valid(p_id text, p_birth date) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  w int[] := array[2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  s int := 0;
  i int;
  expected int;
begin
  if p_id is null or p_id !~ '^[23][0-9]{11}$' or p_birth is null then return false; end if;
  if substr(p_id, 2, 6) <> to_char(p_birth, 'YYMMDD') then return false; end if;
  if (left(p_id, 1) = '2') <> (p_birth < date '2000-01-01') then return false; end if;
  for i in 1..11 loop s := s + substr(p_id, i, 1)::int * w[i]; end loop;
  expected := 11 - (s % 11);
  if expected < 10 then return expected = substr(p_id, 12, 1)::int; end if;
  return true; -- حالات الحافة لا نحكم بها لتفادي رفض بطاقة صحيحة
end $$;

create function app_private.insert_identity(p_user uuid, m jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_birth date;
begin
  begin
    v_birth := (m ->> 'birth_date')::date;
  exception when others then
    raise exception 'invalid_birth_date' using errcode = '22023';
  end;
  if not app_private.kw_civil_id_valid(m ->> 'civil_id', v_birth) then
    raise exception 'invalid_civil_id' using errcode = '22023';
  end if;
  insert into public.author_identity (user_id, civil_id, birth_date, card_serial, nationality, area, block, street, building, floor, unit, paci_no)
  values (
    p_user, m ->> 'civil_id', v_birth, m ->> 'card_serial', trim(m ->> 'nationality'), trim(m ->> 'area'), trim(m ->> 'block'),
    trim(m ->> 'street'), trim(m ->> 'building'), nullif(trim(coalesce(m ->> 'floor', '')), ''), nullif(trim(coalesce(m ->> 'unit', '')), ''),
    nullif(trim(coalesce(m ->> 'paci_no', '')), '')
  );
end $$;

-- التسجيل: ينقل بيانات الهوية من بيانات الطلب إلى الجدول المغلق ثم يمسحها من حساب Auth
create or replace function app_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  v_name := coalesce(nullif(trim(m ->> 'full_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'مستخدم');
  insert into public.profiles (id, full_name) values (new.id, left(rpad(v_name, 2, '_'), 120));
  insert into public.user_roles (user_id, role) values (new.id, 'author');
  if m ? 'civil_id' then
    perform app_private.insert_identity(new.id, m);
    update auth.users
    set raw_user_meta_data = raw_user_meta_data - array['civil_id', 'birth_date', 'card_serial', 'nationality', 'area', 'block', 'street', 'building', 'floor', 'unit', 'paci_no']
    where id = new.id;
  end if;
  return new;
end $$;

-- استكمال الهوية لحساب قائم (مرة واحدة؛ التعديل بعدها عبر الدعم)
create function public.save_my_identity(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if jsonb_typeof(p) <> 'object' then raise exception 'invalid_payload' using errcode = '22023'; end if;
  if exists (select 1 from public.author_identity where user_id = v_uid) then raise exception 'identity_exists' using errcode = '55000'; end if;
  perform app_private.insert_identity(v_uid, p);
  perform app_private.audit(v_uid, 'save_identity', 'author_identity', null);
end $$;

revoke execute on function public.save_my_identity(jsonb) from public, anon;
grant execute on function public.save_my_identity(jsonb) to authenticated;
revoke execute on function app_private.insert_identity(uuid, jsonb) from public, anon, authenticated;
