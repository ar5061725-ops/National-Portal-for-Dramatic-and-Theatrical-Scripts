-- اختبار قواعد العمل (الأمر 083): يعمل داخل معاملة تُلغى دائماً (RAISE في النهاية) فلا تبقى بيانات.
-- شغّله على بيئة التطوير فقط. النتيجة تظهر في رسالة الخطأ الأخيرة TEST_LOG.
do $$
declare
  log text := '';
  a uuid := gen_random_uuid();
  a2 uuid := gen_random_uuid();
  r uuid := gen_random_uuid();
  m uuid := gen_random_uuid();
  d jsonb; ver uuid; sub uuid; res1 jsonb; res2 jsonb; code text; n int; k public.file_kind;
  s2 uuid; att jsonb; ref text; ev jsonb; st text;
begin
  insert into auth.users (id, email, raw_user_meta_data, aud, role) values
    (a,  'a@test.local',  '{"full_name":"كاتب أول"}', 'authenticated', 'authenticated'),
    (a2, 'a2@test.local', '{"full_name":"كاتب ثان","role":"reviewer"}', 'authenticated', 'authenticated'),
    (r,  'r@test.local',  '{"full_name":"مراجع"}', 'authenticated', 'authenticated'),
    (m,  'm@test.local',  '{"full_name":"مشرف"}', 'authenticated', 'authenticated');
  select count(*) into n from public.profiles where id in (a, a2, r, m);
  log := log || 'T1 profiles_created=' || n || ' (expect 4)' || E'\n';
  select count(*) into n from public.user_roles where user_id = a2 and role = 'reviewer';
  log := log || 'T2 reviewer_from_metadata=' || n || ' (expect 0)' || E'\n';
  insert into public.user_roles (user_id, role) values (r, 'reviewer'), (m, 'committee_manager');

  -- ===== المؤلف =====
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  d := public.create_submission_draft('series');
  ver := (d ->> 'version_id')::uuid; sub := (d ->> 'submission_id')::uuid;
  log := log || 'T3 draft_created public_no=' || (d ->> 'public_no') || E'\n';

  begin
    perform public.update_draft_version(ver, '{"title":"بيت على البحر","logline":"لوجلاين","episodes_count":0}'::jsonb);
    log := log || 'T4 zero_episodes_accepted (FAIL)' || E'\n';
  exception when others then log := log || 'T4 zero_episodes_rejected OK: ' || sqlerrm || E'\n'; end;

  begin
    perform public.update_draft_version(ver, '{"status":"approved"}'::jsonb);
    log := log || 'T5 forbidden_field_accepted (FAIL)' || E'\n';
  exception when others then log := log || 'T5 forbidden_field_rejected OK' || E'\n'; end;

  perform public.update_draft_version(ver, '{"title":"بيت على البحر","logline":"بعد رحيل الجد يكتشف الأبناء وصية","episodes_count":30,"genre_codes":["social"]}'::jsonb);

  begin
    res1 := public.submit_version(ver, 'idem-key-0001');
    log := log || 'T6 submit_without_files_accepted (FAIL)' || E'\n';
  exception when others then log := log || 'T6 submit_without_files_rejected OK: ' || sqlerrm || E'\n'; end;

  reset role;
  foreach k in array enum_range(null::public.file_kind) loop
    insert into public.submission_files (version_id, kind, object_key, size_bytes, mime_type, scan_status)
    values (ver, k, a::text || '/' || ver::text || '/' || replace(gen_random_uuid()::text, '-', '') || '.pdf', 1000, 'application/pdf', 'clean');
  end loop;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res1 := public.submit_version(ver, 'idem-key-0001');
  res2 := public.submit_version(ver, 'idem-key-0001');
  log := log || 'T7 double_submit same_result=' || (res1 = res2) || ' status=' || (res1 ->> 'status') || E'\n';
  select count(*) into n from public.submissions where id = sub;
  log := log || 'T8 author_sees_own=' || n || ' (expect 1)' || E'\n';

  -- ===== كاتب آخر لا يرى ولا يكتب =====
  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  select count(*) into n from public.submissions;
  log := log || 'T9 other_author_sees=' || n || ' (expect 0)' || E'\n';
  begin
    insert into public.submissions (author_id) values (a2);
    log := log || 'T10 direct_insert_allowed (FAIL)' || E'\n';
  exception when others then log := log || 'T10 direct_insert_denied OK' || E'\n'; end;
  begin
    perform public.submit_version(ver, 'idem-key-0002');
    log := log || 'T11 foreign_submit_allowed (FAIL)' || E'\n';
  exception when others then log := log || 'T11 foreign_submit_denied OK' || E'\n'; end;

  -- ===== المشرف يعيّن، المراجع يقيّم =====
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  perform public.assign_review(ver, r);
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  select count(*) into n from public.get_review_queue();
  log := log || 'T12 reviewer_queue=' || n || ' (expect 1)' || E'\n';
  select count(*) into n from public.submissions;
  log := log || 'T13 reviewer_reads_submissions=' || n || ' (expect 0: blind)' || E'\n';
  perform public.save_review(
    (select assignment_id from public.get_review_queue() limit 1),
    '{"structure":9,"characters":8,"dialogue":9,"originality":10}'::jsonb, 'approve',
    '[{"locator":"المشهد 12","body":"تمهيد أوضح مطلوب"}]'::jsonb, true);
  select score::text into st from public.reviews limit 1;
  log := log || 'T14 review_score=' || st || ' (expect 9.00)' || E'\n';

  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  begin
    perform public.record_decision(ver, 'approved', '');
    log := log || 'T15 decision_without_reason (FAIL)' || E'\n';
  exception when others then log := log || 'T15 decision_without_reason_rejected OK' || E'\n'; end;
  res1 := public.record_decision(ver, 'approved', 'نص مستوفٍ للمعايير');
  code := res1 ->> 'verification_code';
  begin
    perform public.record_decision(ver, 'rejected', 'محاولة ثانية');
    log := log || 'T16 second_decision (FAIL)' || E'\n';
  exception when others then log := log || 'T16 second_decision_rejected OK' || E'\n'; end;

  -- ===== زائر =====
  reset role;
  set local role anon;
  select status into st from public.verify_certificate(code);
  log := log || 'T17 anon_verify status=' || coalesce(st, 'null') || ' (expect active)' || E'\n';
  begin
    perform 1 from app_private.payment_attempts;
    log := log || 'T18 anon_reads_private (FAIL)' || E'\n';
  exception when others then log := log || 'T18 anon_private_denied OK' || E'\n'; end;
  begin
    perform 1 from public.submissions;
    log := log || 'T19 anon_reads_submissions (FAIL)' || E'\n';
  exception when others then log := log || 'T19 anon_submissions_denied OK' || E'\n'; end;
  begin
    perform public.reserve_payment_attempt(a, sub, 'idem-key-9999', 'sandbox');
    log := log || 'T20 anon_calls_payment_rpc (FAIL)' || E'\n';
  exception when others then log := log || 'T20 anon_payment_rpc_denied OK' || E'\n'; end;

  -- ===== الدفع =====
  reset role;
  update public.app_settings set value = 'true'::jsonb where setting_key = 'fees_enabled';
  insert into app_private.fee_rules (service_code, amount_minor, effective_at) values ('submission', 5000, now() - interval '1 day');
  begin
    insert into app_private.fee_rules (service_code, amount_minor, effective_at) values ('submission', 7000, now() - interval '2 hours');
    log := log || 'T21 overlapping_fee_accepted (FAIL)' || E'\n';
  exception when others then log := log || 'T21 overlapping_fee_rejected OK' || E'\n'; end;
  insert into public.submissions (author_id, status) values (a, 'awaiting_payment') returning id into s2;
  set local role service_role;
  att := public.reserve_payment_attempt(a, s2, 'idem-key-0003', 'sandbox');
  log := log || 'T22 reserve amount=' || (att ->> 'amount_minor') || ' reused=' || (att ->> 'reused') || E'\n';
  res2 := public.reserve_payment_attempt(a, s2, 'idem-key-0004', 'sandbox');
  log := log || 'T23 reserve_again reused=' || (res2 ->> 'reused') || ' same_attempt=' || ((att ->> 'attempt_id') = (res2 ->> 'attempt_id')) || E'\n';
  perform public.attach_provider_invoice((att ->> 'attempt_id')::uuid, 'INV-1', 'https://demo.myfatoorah.com/pay/1', now() + interval '1 hour');
  ref := att ->> 'merchant_ref';
  ev := public.apply_payment_event('myfatoorah', 'sandbox', 'evt-bad-1', 'TransactionsStatusChanged', ref, 'PAY-1', 4000, 'KWD', 'paid');
  log := log || 'T24 wrong_amount=' || ev::text || E'\n';
  ev := public.apply_payment_event('myfatoorah', 'sandbox', 'evt-1', 'TransactionsStatusChanged', ref, 'PAY-1', 5000, 'KWD', 'paid');
  log := log || 'T25 paid=' || ev::text || E'\n';
  ev := public.apply_payment_event('myfatoorah', 'sandbox', 'evt-1', 'TransactionsStatusChanged', ref, 'PAY-1', 5000, 'KWD', 'paid');
  log := log || 'T26 duplicate=' || ev::text || E'\n';
  ev := public.apply_payment_event('myfatoorah', 'sandbox', 'evt-late-fail', 'TransactionsStatusChanged', ref, 'PAY-1', 5000, 'KWD', 'failed');
  reset role;
  select status::text into st from public.submissions where id = s2;
  select count(*) into n from app_private.receipts;
  log := log || 'T27 status_after_pay=' || st || ' receipts=' || n || ' (expect received, 1)' || E'\n';
  select state::text into st from app_private.payment_attempts where merchant_ref = ref;
  log := log || 'T28 late_failed_does_not_regress state=' || st || ' (expect paid)' || E'\n';
  select count(*) into n from app_private.payment_reconciliations;
  log := log || 'T29 reconciliations=' || n || ' (expect 1 amount_mismatch)' || E'\n';

  raise exception E'TEST_LOG\n%', log;
end $$;
