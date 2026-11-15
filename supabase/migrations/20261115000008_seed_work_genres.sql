-- تصنيفات الأعمال المعتمدة في النموذج (تتطابق رموزها مع src/config/submission.ts)
insert into public.work_genres (code, title_ar) values
  ('mystery', 'غموض'),
  ('crime', 'جريمة'),
  ('thriller', 'تشويق'),
  ('psych', 'نفسي'),
  ('mono', 'مونودراما'),
  ('social', 'اجتماعي')
on conflict (code) do nothing;

grant select on public.work_genres to anon, authenticated;
alter table public.work_genres enable row level security;
drop policy if exists work_genres_public_read on public.work_genres;
create policy work_genres_public_read on public.work_genres for select to anon, authenticated using (active);
