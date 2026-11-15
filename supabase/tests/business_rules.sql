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
  r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid();
  rid uuid; asg1 uuid; asg2 uuid; asg3 uuid; dcn uuid; sc_doc jsonb; sc_low jsonb; sc_mid jsonb; keys text[] :=
    array['idea_originality','dramatic_structure','characters','dialogue','rhythm_suspense','staging','world_genre','execution_maturity'];
begin
  insert into auth.users (id, email, raw_user_meta_data, aud, role) values
    (a,  'a@test.local',  '{"full_name":"كاتب أول"}', 'authenticated', 'authenticated'),
    (a2, 'a2@test.local', '{"full_name":"كاتب ثان","role":"reviewer"}', 'authenticated', 'authenticated'),
    (r,  'r@test.local',  '{"full_name":"مراجع"}', 'authenticated', 'authenticated'),
    (m,  'm@test.local',  '{"full_name":"مشرف"}', 'authenticated', 'authenticated'),
    (r2, 'r2@test.local', '{"full_name":"مراجع ثان"}', 'authenticated', 'authenticated'),
    (r3, 'r3@test.local', '{"full_name":"مراجع ثالث"}', 'authenticated', 'authenticated');
  select count(*) into n from public.profiles where id in (a, a2, r, m);
  log := log || 'T1 profiles_created=' || n || ' (expect 4)' || E'\n';
  select count(*) into n from public.user_roles where user_id = a2 and role = 'reviewer';
  log := log || 'T2 reviewer_from_metadata=' || n || ' (expect 0)' || E'\n';
  insert into public.user_roles (user_id, role) values (r, 'reviewer'), (r2, 'reviewer'), (r3, 'reviewer'), (m, 'committee_manager');
  -- درجات (مثال الوثيقة = 76.5 / منخفضة = 50 / متوسطة = 80)
  select jsonb_agg(jsonb_build_object('criterion_key', ck, 'score', (array[8,8,7,7,8,8,7,8])[ci], 'rationale', 'مبرر', 'locator', 'ص ' || ci)),
         jsonb_agg(jsonb_build_object('criterion_key', ck, 'score', 5, 'rationale', 'مبرر')),
         jsonb_agg(jsonb_build_object('criterion_key', ck, 'score', 8, 'rationale', 'مبرر'))
  into sc_doc, sc_low, sc_mid from unnest(keys) with ordinality as t(ck, ci);

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
  asg1 := public.assign_review(ver, r);
  asg2 := public.assign_review(ver, r2);
  begin
    perform public.assign_review(ver, r3);
    log := log || 'T12a third_reviewer_before_arbitration (FAIL)' || E'\n';
  exception when others then log := log || 'T12a third_reviewer_before_arbitration_rejected OK: ' || sqlerrm || E'\n'; end;
  select round_id into rid from public.get_manager_rounds() limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  select count(*) into n from public.get_review_queue();
  log := log || 'T12 reviewer_queue=' || n || ' (expect 1)' || E'\n';
  select count(*) into n from public.submissions;
  log := log || 'T13 reviewer_reads_submissions=' || n || ' (expect 0: blind)' || E'\n';
  begin
    perform public.get_review_form(asg1);
    log := log || 'T13a form_without_ack (FAIL)' || E'\n';
  exception when others then log := log || 'T13a form_requires_conflict_ack OK: ' || sqlerrm || E'\n'; end;
  perform public.acknowledge_no_conflict(asg1);
  log := log || 'T13b rubric_criteria=' || jsonb_array_length(public.get_review_form(asg1) -> 'rubric' -> 'criteria') || ' (expect 8)' || E'\n';
  begin
    perform public.save_review(asg1, '[{"criterion_key":"idea_originality","score":11,"rationale":"x"}]'::jsonb, 'revise', '[]'::jsonb);
    log := log || 'T13c score_11_accepted (FAIL)' || E'\n';
  exception when others then log := log || 'T13c score_11_rejected OK' || E'\n'; end;
  perform public.save_review(asg1, sc_doc, 'revise',
    '[{"locator":"المشهد 12","body":"تمهيد أوضح مطلوب","proposed_for_author":true,"requires_revision":true,"required_action":"إعادة كتابة التمهيد","completion_criterion":"ظهور الدافع قبل المشهد 5"}]'::jsonb);
  begin
    perform public.save_review(asg1, '[{"criterion_key":"unknown","score":5,"rationale":"x"}]'::jsonb, 'revise', null);
    log := log || 'T13d foreign_criterion_accepted (FAIL)' || E'\n';
  exception when others then log := log || 'T13d foreign_criterion_rejected OK' || E'\n'; end;
  res1 := public.submit_review(asg1);
  log := log || 'T14 doc_example_score=' || (res1 ->> 'score') || ' round=' || (res1 ->> 'round_status') || ' (expect 76.500 / collecting)' || E'\n';
  begin
    perform public.save_review(asg1, sc_mid, 'approve', null);
    log := log || 'T14a edit_after_submit (FAIL)' || E'\n';
  exception when others then log := log || 'T14a edit_after_submit_rejected OK: ' || sqlerrm || E'\n'; end;

  -- المراجع الثاني: مسودة ناقصة لا تُرسل، ولا يرى زميله مسوداته
  perform set_config('request.jwt.claims', json_build_object('sub', r2, 'role', 'authenticated')::text, true);
  perform public.acknowledge_no_conflict(asg2);
  perform public.save_review(asg2, '[{"criterion_key":"idea_originality","score":5,"rationale":"مبرر"}]'::jsonb, 'reject', null);
  begin
    perform public.submit_review(asg2);
    log := log || 'T14b incomplete_submit (FAIL)' || E'\n';
  exception when others then log := log || 'T14b incomplete_submit_rejected OK: ' || sqlerrm || E'\n'; end;
  select count(*) into n from public.reviews;
  log := log || 'T14c reviewer2_sees_reviews=' || n || ' (expect 1: own only)' || E'\n';
  perform public.save_review(asg2, sc_low, 'reject', '[]'::jsonb);
  res2 := public.submit_review(asg2);
  log := log || 'T14d low_review score=' || (res2 ->> 'score') || ' round=' || (res2 ->> 'round_status') || ' (expect 50.000 / arbitration: gap 26.5 >= 15)' || E'\n';

  -- القرار ممنوع قبل اكتمال التحكيم
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  begin
    perform public.record_decision(rid, 'approved', 'سبب للمؤلف');
    log := log || 'T15 decision_during_arbitration (FAIL)' || E'\n';
  exception when others then log := log || 'T15 decision_during_arbitration_rejected OK: ' || sqlerrm || E'\n'; end;
  asg3 := public.assign_review(ver, r3);
  perform set_config('request.jwt.claims', json_build_object('sub', r3, 'role', 'authenticated')::text, true);
  perform public.acknowledge_no_conflict(asg3);
  perform public.save_review(asg3, sc_mid, 'revise', '[]'::jsonb);
  res1 := public.submit_review(asg3);
  log := log || 'T15a third_review score=' || (res1 ->> 'score') || ' round=' || (res1 ->> 'round_status') || ' (expect 80.000 / awaiting_decision)' || E'\n';

  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  d := public.get_round_summary(rid);
  log := log || 'T15b median=' || (d ->> 'aggregate_score') || ' recommended=' || (d ->> 'recommended_outcome') || ' (expect 76.500 / revision_requested)' || E'\n';
  begin
    perform public.record_decision(rid, 'approved', 'سبب للمؤلف');
    log := log || 'T15c differs_without_internal_reason (FAIL)' || E'\n';
  exception when others then log := log || 'T15c differs_without_internal_reason_rejected OK' || E'\n'; end;
  dcn := public.record_decision(rid, 'approved', 'اعتماد بعد مراجعة المشرف', 'تقدير استثنائي موثق للمشرف');
  begin
    perform public.record_decision(rid, 'rejected', 'محاولة ثانية', 'سبب داخلي');
    log := log || 'T16 second_decision (FAIL)' || E'\n';
  exception when others then log := log || 'T16 second_decision_rejected OK' || E'\n'; end;
  select status::text into st from public.submissions where id = sub;
  log := log || 'T16a status_before_publish=' || st || ' (expect in_review)' || E'\n';
  res1 := public.publish_review_result(dcn, 'idem-pub-0001');
  res2 := public.publish_review_result(dcn, 'idem-pub-0001');
  log := log || 'T16b publish idempotent=' || (res1 = res2) || ' status=' || (res1 ->> 'submission_status') || E'\n';
  begin
    perform public.publish_review_result(dcn, 'idem-pub-0002');
    log := log || 'T16c republish (FAIL)' || E'\n';
  exception when others then log := log || 'T16c republish_rejected OK: ' || sqlerrm || E'\n'; end;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  d := public.get_published_result(sub);
  log := log || 'T16d author_snapshot outcome=' || (d ->> 'outcome') || ' score=' || (d ->> 'aggregate_score') || ' notes=' || jsonb_array_length(d -> 'notes')
             || ' internal_leak=' || (d ? 'internal_reason') || ' (expect approved / 76.5 / 1 / false)' || E'\n';
  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  begin
    perform public.get_published_result(sub);
    log := log || 'T16e foreign_author_reads_result (FAIL)' || E'\n';
  exception when others then log := log || 'T16e foreign_author_denied OK' || E'\n'; end;
  reset role;
  select verification_code into code from public.certificates where decision_id = dcn;
  log := log || 'T16f certificate_issued=' || (code is not null) || E'\n';

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
