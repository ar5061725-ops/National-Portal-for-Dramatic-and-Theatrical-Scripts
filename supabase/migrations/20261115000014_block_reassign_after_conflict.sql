-- من أعلن تعارض مصالح على نسخة لا يُعاد تعيينه عليها (يمنع التفاف المشرف أو الخطأ على الإعلان).
create function app_private.block_reassign_after_conflict() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.review_assignments a
    where a.version_id = new.version_id and a.reviewer_id = new.reviewer_id and a.conflict_declared
  ) then
    raise exception 'reviewer_declared_conflict' using errcode = '55000';
  end if;
  return new;
end $$;

create trigger review_assignments_block_reassign before insert on public.review_assignments
  for each row execute function app_private.block_reassign_after_conflict();
