-- قوائم المشرف لتعيين المراجعين: المراجعون المتاحون، والطلبات المختومة التي تنتظر تعييناً.
create function public.get_reviewers() returns table (reviewer_id uuid, full_name text)
language sql stable security definer set search_path = '' as $$
  select ur.user_id, p.full_name
  from public.user_roles ur join public.profiles p on p.id = ur.user_id
  where app_private.has_role(auth.uid(), 'committee_manager') and ur.role = 'reviewer' and ur.revoked_at is null
  order by p.full_name;
$$;

create function public.get_assignable_submissions() returns table (
  version_id uuid, public_no text, work_type public.work_type, logline text, assigned_count int, round_status public.round_status
) language sql stable security definer set search_path = '' as $$
  select v.id, s.public_no, v.work_type, v.logline,
         (select count(*)::int from public.review_assignments a where a.version_id = v.id and a.status in ('active', 'completed')),
         (select r.status from public.review_rounds r where r.version_id = v.id and r.status in ('collecting', 'arbitration') limit 1)
  from public.submissions s
  join public.submission_versions v on v.id = s.current_version_id
  where app_private.has_role(auth.uid(), 'committee_manager')
    and s.status in ('received', 'in_review') and v.sealed_at is not null
    and not exists (select 1 from public.review_rounds r where r.version_id = v.id and r.status in ('awaiting_decision', 'decided'))
  order by s.submitted_at;
$$;

revoke execute on function public.get_reviewers() from public, anon;
revoke execute on function public.get_assignable_submissions() from public, anon;
grant execute on function public.get_reviewers() to authenticated;
grant execute on function public.get_assignable_submissions() to authenticated;
