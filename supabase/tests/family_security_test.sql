begin;
select plan(21);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-000000000001', 'owner-a@example.test', '{"display_name":"Owner A"}'),
  ('00000000-0000-4000-8000-000000000002', 'member-a@example.test', '{"display_name":"Member A"}'),
  ('00000000-0000-4000-8000-000000000003', 'owner-b@example.test', '{"display_name":"Owner B"}'),
  ('00000000-0000-4000-8000-000000000004', 'joiner-one@example.test', '{"display_name":"Joiner One"}'),
  ('00000000-0000-4000-8000-000000000005', 'joiner-two@example.test', '{"display_name":"Joiner Two"}'),
  ('00000000-0000-4000-8000-000000000006', 'rate-limit@example.test', '{"display_name":"Rate Limit"}'),
  ('00000000-0000-4000-8000-000000000007', 'joiner-three@example.test', '{"display_name":"Joiner Three"}');

insert into public.families (id, name, created_by)
values
  ('10000000-0000-4000-8000-000000000001', 'Família A', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', 'Família B', '00000000-0000-4000-8000-000000000003');

insert into public.family_members (id, family_id, user_id, display_name, role)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Owner A', 'owner'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'Member A', 'member'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'Owner B', 'owner');

insert into public.events (
  id, family_id, title, kind, starts_at, subject_member_id, created_by
)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Evento A', 'outro', now() + interval '1 day', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Evento B', 'outro', now() + interval '1 day', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003');

insert into public.family_invites (
  family_id, code, created_by, expires_at
)
values (
  '10000000-0000-4000-8000-000000000001',
  'A1B2C3D4E5F6',
  '00000000-0000-4000-8000-000000000001',
  now() + interval '24 hours'
);

select has_table('public', 'family_invites', 'convites são recursos versionados');

select ok(
  not exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in ('profiles', 'families', 'family_members', 'events', 'water_entries', 'memories', 'family_invites')
      and not relation.relrowsecurity
  ),
  'todas as tabelas públicas com dados da aplicação usam RLS'
);

select ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.family_invites', 'select'),
  'convites não podem ser lidos diretamente pela API'
);

select ok(
  not pg_catalog.has_table_privilege('authenticated', 'private.family_invite_join_attempts', 'select'),
  'tentativas de convite não são expostas ao cliente'
);

select ok(
  not pg_catalog.has_function_privilege('anon', 'public.join_family(text,text)', 'execute'),
  'usuários anônimos não podem chamar join_family'
);

select ok(
  pg_catalog.has_function_privilege('authenticated', 'public.join_family(text,text)', 'execute'),
  'usuários autenticados podem chamar join_family'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.families),
  1::bigint,
  'RLS mostra ao proprietário somente sua família'
);

select is(
  (select invite_code from public.get_active_family_invite('10000000-0000-4000-8000-000000000001')),
  'A1B2C3D4E5F6',
  'o proprietário pode obter o convite ativo via RPC'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.get_active_family_invite('10000000-0000-4000-8000-000000000001')),
  0::bigint,
  'um membro comum não recebe o segredo do convite'
);

select throws_ok(
  $$insert into public.events (
    family_id, title, kind, starts_at, subject_member_id, created_by
  ) values (
    '10000000-0000-4000-8000-000000000002', 'Ataque cruzado', 'outro', now(),
    '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002'
  )$$,
  '42501',
  'new row violates row-level security policy for table "events"',
  'um membro não insere eventos em outra família'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);

select is(
  (select outcome from public.join_family('A1B2C3D4E5F6', 'Joiner One')),
  'JOINED'::text,
  'um convite válido permite a entrada uma única vez'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated"}',
  true
);

select is(
  (select outcome from public.join_family('A1B2C3D4E5F6', 'Joiner Two')),
  'INVITE_INVALID'::text,
  'um convite usado retorna o mesmo resultado neutro de um convite inválido'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000006","role":"authenticated"}',
  true
);

select results_eq(
  $$select outcome
    from generate_series(1, 5) as attempts(attempt)
    cross join lateral public.join_family(
      case when attempt > 0 then 'NOT-A-CODE' else '' end,
      'Rate Limit'
    )$$,
  array['INVITE_INVALID', 'INVITE_INVALID', 'INVITE_INVALID', 'INVITE_INVALID', 'INVITE_INVALID']::text[],
  'as cinco primeiras tentativas inválidas usam uma resposta neutra'
);

select is(
  (select outcome from public.join_family('NOT-A-CODE', 'Rate Limit')),
  'RATE_LIMITED'::text,
  'a sexta tentativa em 15 minutos é bloqueada'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select ok(
  (select invite_code ~ '^[A-F0-9]{12}$'
    from public.rotate_family_invite('10000000-0000-4000-8000-000000000001')),
  'a rotação emite um novo segredo forte'
);

select isnt(
  (select invite_code from public.get_active_family_invite('10000000-0000-4000-8000-000000000001')),
  'A1B2C3D4E5F6',
  'a rotação invalida o código anterior'
);

select lives_ok(
  $$select public.revoke_family_invite('10000000-0000-4000-8000-000000000001')$$,
  'o proprietário pode revogar o convite'
);

select is(
  (select count(*) from public.get_active_family_invite('10000000-0000-4000-8000-000000000001')),
  0::bigint,
  'um convite revogado deixa de ser retornado'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000007","role":"authenticated"}',
  true
);

select is(
  (select outcome from public.join_family('A1B2C3D4E5F6', 'Joiner Three')),
  'INVITE_INVALID'::text,
  'códigos antigos ou revogados permanecem inutilizáveis'
);

reset role;

select ok(
  not exists (
    select 1
    from pg_catalog.pg_policy
    where polrelid in (
      'public.profiles'::regclass,
      'public.families'::regclass,
      'public.family_members'::regclass,
      'public.events'::regclass,
      'public.water_entries'::regclass,
      'public.memories'::regclass
    )
      and polcmd = 'w'
      and (polqual is null or polwithcheck is null)
  ),
  'todas as políticas UPDATE definem USING e WITH CHECK'
);

select is(
  (select count(*) from pg_catalog.pg_policy where polrelid = 'public.family_invites'::regclass),
  0::bigint,
  'family_invites não possui política direta: acesso somente por RPC controlada'
);

select * from finish();
rollback;
