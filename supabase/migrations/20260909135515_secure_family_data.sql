-- Replace permanent family codes with short-lived, one-use invitations.
-- Expected failures return a neutral outcome so rate-limit records are committed.

begin;

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  code text not null unique check (code ~ '^[A-F0-9]{12}$'),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses between 1 and 10),
  uses_count integer not null default 0 check (uses_count between 0 and max_uses),
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create unique index family_invites_one_active_per_family_idx
on public.family_invites (family_id)
where revoked_at is null and uses_count < max_uses;

create index family_invites_family_created_at_idx
on public.family_invites (family_id, created_at desc);

create table private.family_invite_join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index family_invite_join_attempts_recent_idx
on private.family_invite_join_attempts (user_id, attempted_at desc);

-- Existing families receive a replacement code valid for 24 hours and one use.
insert into public.family_invites (family_id, code, created_by, expires_at)
select id, invite_code || upper(substr(encode(extensions.gen_random_bytes(2), 'hex'), 1, 4)),
  created_by, now() + interval '24 hours'
from public.families;

drop function public.join_family(text, text);
drop function private.join_family_impl(text, text);

alter table public.families drop column invite_code;

create or replace function private.create_family_impl(
  family_name_input text,
  display_name_input text
)
returns table (
  family_id uuid,
  family_name text,
  invite_code text,
  member_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  clean_family_name text := trim(coalesce(family_name_input, ''));
  clean_display_name text := trim(coalesce(display_name_input, ''));
  new_family_id uuid;
  new_member_id uuid;
  new_invite_code text;
begin
  if current_user_id is null then
    raise exception 'Faça login para criar uma família.' using errcode = 'P0001';
  end if;
  if char_length(clean_family_name) not between 1 and 80 then
    raise exception 'O nome da família deve ter de 1 a 80 caracteres.' using errcode = 'P0001';
  end if;
  if char_length(clean_display_name) not between 1 and 60 then
    raise exception 'Seu nome deve ter de 1 a 60 caracteres.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.family_members where user_id = current_user_id) then
    raise exception 'Você já participa de uma família.' using errcode = 'P0001';
  end if;

  insert into public.families (name, created_by)
  values (clean_family_name, current_user_id)
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, display_name, role, color)
  values (new_family_id, current_user_id, clean_display_name, 'owner', '#FF826F')
  returning id into new_member_id;

  loop
    new_invite_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));
    begin
      insert into public.family_invites (family_id, code, created_by, expires_at)
      values (new_family_id, new_invite_code, current_user_id, now() + interval '24 hours');
      exit;
    exception when unique_violation then
      -- A collision is exceptionally unlikely; retry without exposing it to the client.
    end;
  end loop;

  update public.profiles set display_name = clean_display_name where id = current_user_id;

  return query select new_family_id, clean_family_name, new_invite_code, new_member_id;
end;
$$;

create or replace function private.get_active_family_invite_impl(target_family_id uuid)
returns table (
  invite_code text,
  expires_at timestamptz,
  remaining_uses integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_family_owner(target_family_id) then
    return;
  end if;

  return query
  select invitation.code, invitation.expires_at,
    invitation.max_uses - invitation.uses_count
  from public.family_invites as invitation
  where invitation.family_id = target_family_id
    and invitation.revoked_at is null
    and invitation.expires_at > now()
    and invitation.uses_count < invitation.max_uses
  order by invitation.created_at desc
  limit 1;
end;
$$;

create or replace function private.rotate_family_invite_impl(target_family_id uuid)
returns table (
  invite_code text,
  expires_at timestamptz,
  remaining_uses integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_invite_code text;
  new_expires_at timestamptz := now() + interval '24 hours';
begin
  if current_user_id is null or not private.is_family_owner(target_family_id) then
    raise exception 'Somente a pessoa administradora pode gerenciar convites.' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_family_id::text, 0)
  );

  update public.family_invites
  set revoked_at = now()
  where family_id = target_family_id
    and revoked_at is null
    and uses_count < max_uses;

  loop
    new_invite_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));
    begin
      insert into public.family_invites (family_id, code, created_by, expires_at)
      values (target_family_id, new_invite_code, current_user_id, new_expires_at);
      exit;
    exception when unique_violation then
      -- Retry on the extraordinarily unlikely global token collision.
    end;
  end loop;

  return query select new_invite_code, new_expires_at, 1;
end;
$$;

create or replace function private.revoke_family_invite_impl(target_family_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.is_family_owner(target_family_id) then
    raise exception 'Somente a pessoa administradora pode gerenciar convites.' using errcode = 'P0001';
  end if;

  update public.family_invites
  set revoked_at = now()
  where family_id = target_family_id
    and revoked_at is null
    and uses_count < max_uses;
end;
$$;

create or replace function private.join_family_impl(
  invite_code_input text,
  display_name_input text
)
returns table (
  family_id uuid,
  family_name text,
  member_id uuid,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  clean_code text := upper(regexp_replace(coalesce(invite_code_input, ''), '[^A-Fa-f0-9]', '', 'g'));
  clean_display_name text := trim(coalesce(display_name_input, ''));
  target_invite public.family_invites%rowtype;
  target_family_name text;
  new_member_id uuid;
  recent_attempts integer;
begin
  if current_user_id is null then
    return query select null::uuid, null::text, null::uuid, 'AUTH_REQUIRED'::text;
    return;
  end if;
  if char_length(clean_display_name) not between 1 and 60 then
    return query select null::uuid, null::text, null::uuid, 'INVALID_DISPLAY_NAME'::text;
    return;
  end if;
  if exists (select 1 from public.family_members where user_id = current_user_id) then
    return query select null::uuid, null::text, null::uuid, 'ALREADY_MEMBER'::text;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  delete from private.family_invite_join_attempts
  where attempted_at < now() - interval '24 hours';

  select count(*)::integer into recent_attempts
  from private.family_invite_join_attempts
  where user_id = current_user_id
    and attempted_at >= now() - interval '15 minutes';

  if recent_attempts >= 5 then
    return query select null::uuid, null::text, null::uuid, 'RATE_LIMITED'::text;
    return;
  end if;

  insert into private.family_invite_join_attempts (user_id) values (current_user_id);

  if clean_code !~ '^[A-F0-9]{12}$' then
    return query select null::uuid, null::text, null::uuid, 'INVITE_INVALID'::text;
    return;
  end if;

  select invitation.* into target_invite
  from public.family_invites as invitation
  where invitation.code = clean_code
  for update;

  if target_invite.id is null
    or target_invite.revoked_at is not null
    or target_invite.expires_at <= now()
    or target_invite.uses_count >= target_invite.max_uses then
    return query select null::uuid, null::text, null::uuid, 'INVITE_INVALID'::text;
    return;
  end if;

  select name into target_family_name
  from public.families
  where id = target_invite.family_id;

  insert into public.family_members (family_id, user_id, display_name, role, color)
  values (target_invite.family_id, current_user_id, clean_display_name, 'member', '#36A67C')
  returning id into new_member_id;

  update public.family_invites
  set uses_count = uses_count + 1,
      last_used_at = now()
  where id = target_invite.id;

  update public.profiles set display_name = clean_display_name where id = current_user_id;

  return query select target_invite.family_id, target_family_name, new_member_id, 'JOINED'::text;
end;
$$;

revoke all on function private.create_family_impl(text, text) from public, anon, authenticated;
revoke all on function private.get_active_family_invite_impl(uuid) from public, anon, authenticated;
revoke all on function private.rotate_family_invite_impl(uuid) from public, anon, authenticated;
revoke all on function private.revoke_family_invite_impl(uuid) from public, anon, authenticated;
revoke all on function private.join_family_impl(text, text) from public, anon, authenticated;

grant execute on function private.create_family_impl(text, text) to authenticated;
grant execute on function private.get_active_family_invite_impl(uuid) to authenticated;
grant execute on function private.rotate_family_invite_impl(uuid) to authenticated;
grant execute on function private.revoke_family_invite_impl(uuid) to authenticated;
grant execute on function private.join_family_impl(text, text) to authenticated;

create or replace function public.get_active_family_invite(target_family_id uuid)
returns table (invite_code text, expires_at timestamptz, remaining_uses integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_active_family_invite_impl(target_family_id);
$$;

create or replace function public.rotate_family_invite(target_family_id uuid)
returns table (invite_code text, expires_at timestamptz, remaining_uses integer)
language sql
security invoker
set search_path = ''
as $$
  select * from private.rotate_family_invite_impl(target_family_id);
$$;

create or replace function public.revoke_family_invite(target_family_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.revoke_family_invite_impl(target_family_id);
$$;

create function public.join_family(invite_code_input text, display_name_input text)
returns table (family_id uuid, family_name text, member_id uuid, outcome text)
language sql
security invoker
set search_path = ''
as $$
  select * from private.join_family_impl(invite_code_input, display_name_input);
$$;

revoke all on function public.get_active_family_invite(uuid) from public, anon;
revoke all on function public.rotate_family_invite(uuid) from public, anon;
revoke all on function public.revoke_family_invite(uuid) from public, anon;
revoke all on function public.join_family(text, text) from public, anon;

grant execute on function public.get_active_family_invite(uuid) to authenticated;
grant execute on function public.rotate_family_invite(uuid) to authenticated;
grant execute on function public.revoke_family_invite(uuid) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;

alter table public.family_invites enable row level security;

revoke all on table public.family_invites from public, anon, authenticated;
revoke all on table private.family_invite_join_attempts from public, anon, authenticated;

commit;
