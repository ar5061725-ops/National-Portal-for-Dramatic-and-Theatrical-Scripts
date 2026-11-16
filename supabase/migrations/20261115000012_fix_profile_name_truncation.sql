-- خطأ: rpad(v_name, 2, '_') كان يقتطع الاسم إلى حرفين. الصحيح: نُكمل بـ _ فقط إن كان الاسم أقصر من حرفين.
create or replace function app_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  v_name := coalesce(nullif(trim(m ->> 'full_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'مستخدم');
  if char_length(v_name) < 2 then v_name := rpad(v_name, 2, '_'); end if;
  insert into public.profiles (id, full_name) values (new.id, left(v_name, 120));
  insert into public.user_roles (user_id, role) values (new.id, 'author');
  if m ? 'civil_id' then
    perform app_private.insert_identity(new.id, m);
    update auth.users
    set raw_user_meta_data = raw_user_meta_data - array['civil_id', 'birth_date', 'card_serial', 'nationality', 'area', 'block', 'street', 'building', 'floor', 'unit', 'paci_no']
    where id = new.id;
  end if;
  return new;
end $$;

-- إصلاح الأسماء المقتطعة سابقاً من بيانات الحساب (الاسم الأصلي ما زال في user_metadata)
update public.profiles p
set full_name = left(trim(u.raw_user_meta_data ->> 'full_name'), 120)
from auth.users u
where u.id = p.id
  and char_length(p.full_name) = 2
  and char_length(trim(coalesce(u.raw_user_meta_data ->> 'full_name', ''))) > 2;
