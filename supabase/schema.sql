-- Laço: banco compartilhado, autenticação e regras de segurança.
-- Execute uma única vez no SQL Editor do projeto Supabase.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique check (invite_code ~ '^[A-F0-9]{8}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  role text not null default 'member' check (role in ('owner', 'member')),
  color text not null default '#36A67C' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (user_id),
  unique (id, family_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  kind text not null check (kind in ('consulta', 'exame', 'remedio', 'outro')),
  starts_at timestamptz not null,
  subject_member_id uuid not null,
  created_by uuid not null references auth.users(id),
  location text check (location is null or char_length(location) <= 200),
  notes text check (notes is null or char_length(notes) <= 2000),
  reminder_minutes integer not null default 60 check (reminder_minutes between 0 and 10080),
  medication_mode text check (medication_mode in ('period', 'continuous')),
  medication_time time,
  medication_duration_days integer check (medication_duration_days between 1 and 30),
  medication_interval_hours integer check (medication_interval_hours between 1 and 24),
  medication_total_doses integer check (medication_total_doses between 1 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (subject_member_id, family_id)
    references public.family_members(id, family_id) on delete cascade,
  check (
    (kind <> 'remedio' and medication_mode is null and medication_time is null
      and medication_duration_days is null and medication_interval_hours is null
      and medication_total_doses is null)
    or
    (kind = 'remedio' and medication_mode = 'continuous' and medication_time is not null
      and medication_duration_days is null and medication_interval_hours is null
      and medication_total_doses is null)
    or
    (kind = 'remedio' and medication_mode = 'period' and medication_time is null
      and medication_duration_days is not null and medication_interval_hours is not null
      and medication_total_doses is not null)
  )
);

create table public.water_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  subject_member_id uuid not null,
  amount_ml integer not null check (amount_ml between 1 and 5000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (subject_member_id, family_id)
    references public.family_members(id, family_id) on delete cascade
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  caption text check (caption is null or char_length(caption) <= 1000),
  image_path text not null check (char_length(image_path) between 1 and 500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index family_members_family_id_idx on public.family_members(family_id);
create index families_created_by_idx on public.families(created_by);
create index events_family_starts_at_idx on public.events(family_id, starts_at);
create index events_subject_member_id_idx on public.events(subject_member_id);
create index events_created_by_idx on public.events(created_by);
create index water_entries_family_created_at_idx on public.water_entries(family_id, created_at desc);
create index water_entries_subject_member_id_idx on public.water_entries(subject_member_id);
create index water_entries_created_by_idx on public.water_entries(created_by);
create index memories_family_created_at_idx on public.memories(family_id, created_at desc);
create index memories_created_by_idx on public.memories(created_by);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_updated_at() from public, anon, authenticated;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger families_touch_updated_at before update on public.families
for each row execute function private.touch_updated_at();
create trigger events_touch_updated_at before update on public.events
for each row execute function private.touch_updated_at();
create trigger memories_touch_updated_at before update on public.memories
for each row execute function private.touch_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_name text;
begin
  candidate_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Pessoa da família'
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(candidate_name, 60))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, display_name)
select
  id,
  left(coalesce(nullif(trim(raw_user_meta_data ->> 'display_name'), ''), split_part(email, '@', 1), 'Pessoa da família'), 60)
from auth.users
on conflict (id) do nothing;

create or replace function private.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = target_family_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_family_owner(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = target_family_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

revoke all on function private.is_family_member(uuid) from public, anon, authenticated;
revoke all on function private.is_family_owner(uuid) from public, anon, authenticated;
grant execute on function private.is_family_member(uuid) to authenticated;
grant execute on function private.is_family_owner(uuid) to authenticated;

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

  loop
    new_invite_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    begin
      insert into public.families (name, invite_code, created_by)
      values (clean_family_name, new_invite_code, current_user_id)
      returning id into new_family_id;
      exit;
    exception when unique_violation then
      -- Um código igual é extremamente improvável; gere outro se acontecer.
    end;
  end loop;

  insert into public.family_members (family_id, user_id, display_name, role, color)
  values (new_family_id, current_user_id, clean_display_name, 'owner', '#FF826F')
  returning id into new_member_id;

  update public.profiles set display_name = clean_display_name where id = current_user_id;

  return query select new_family_id, clean_family_name, new_invite_code, new_member_id;
end;
$$;

create or replace function private.join_family_impl(
  invite_code_input text,
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
  clean_code text := upper(regexp_replace(coalesce(invite_code_input, ''), '[^A-Fa-f0-9]', '', 'g'));
  clean_display_name text := trim(coalesce(display_name_input, ''));
  target_family public.families%rowtype;
  new_member_id uuid;
begin
  if current_user_id is null then
    raise exception 'Faça login para entrar em uma família.' using errcode = 'P0001';
  end if;
  if char_length(clean_display_name) not between 1 and 60 then
    raise exception 'Seu nome deve ter de 1 a 60 caracteres.' using errcode = 'P0001';
  end if;
  if clean_code !~ '^[A-F0-9]{8}$' then
    raise exception 'Digite um código de convite válido.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.family_members where user_id = current_user_id) then
    raise exception 'Você já participa de uma família.' using errcode = 'P0001';
  end if;

  select f.* into target_family
  from public.families as f
  where f.invite_code = clean_code;

  if target_family.id is null then
    raise exception 'Código de convite não encontrado.' using errcode = 'P0001';
  end if;

  insert into public.family_members (family_id, user_id, display_name, role, color)
  values (target_family.id, current_user_id, clean_display_name, 'member', '#36A67C')
  returning id into new_member_id;

  update public.profiles set display_name = clean_display_name where id = current_user_id;

  return query select target_family.id, target_family.name, target_family.invite_code, new_member_id;
end;
$$;

revoke all on function private.create_family_impl(text, text) from public, anon, authenticated;
revoke all on function private.join_family_impl(text, text) from public, anon, authenticated;
grant execute on function private.create_family_impl(text, text) to authenticated;
grant execute on function private.join_family_impl(text, text) to authenticated;

create or replace function public.create_family(family_name_input text, display_name_input text)
returns table (family_id uuid, family_name text, invite_code text, member_id uuid)
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_family_impl(family_name_input, display_name_input);
$$;

create or replace function public.join_family(invite_code_input text, display_name_input text)
returns table (family_id uuid, family_name text, invite_code text, member_id uuid)
language sql
security invoker
set search_path = ''
as $$
  select * from private.join_family_impl(invite_code_input, display_name_input);
$$;

revoke all on function public.create_family(text, text) from public, anon;
revoke all on function public.join_family(text, text) from public, anon;
grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.events enable row level security;
alter table public.water_entries enable row level security;
alter table public.memories enable row level security;

create policy "profile visible to its user" on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy "profile editable by its user" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "families visible to members" on public.families
for select to authenticated
using (private.is_family_member(id));

create policy "owners edit family name" on public.families
for update to authenticated
using (private.is_family_owner(id))
with check (private.is_family_owner(id));

create policy "families removable by owners" on public.families
for delete to authenticated
using (private.is_family_owner(id));

create policy "members visible to their family" on public.family_members
for select to authenticated
using (private.is_family_member(family_id));

create policy "members edit their own appearance" on public.family_members
for update to authenticated
using (user_id = (select auth.uid()) and private.is_family_member(family_id))
with check (user_id = (select auth.uid()) and private.is_family_member(family_id));

create policy "owners remove members" on public.family_members
for delete to authenticated
using (role <> 'owner' and (
  user_id = (select auth.uid()) or private.is_family_owner(family_id)
));

create policy "family reads events" on public.events
for select to authenticated
using (private.is_family_member(family_id));
create policy "family creates events" on public.events
for insert to authenticated
with check (private.is_family_member(family_id) and created_by = (select auth.uid()));
create policy "family updates events" on public.events
for update to authenticated
using (private.is_family_member(family_id))
with check (private.is_family_member(family_id));
create policy "family deletes events" on public.events
for delete to authenticated
using (private.is_family_member(family_id));

create policy "family reads water" on public.water_entries
for select to authenticated
using (private.is_family_member(family_id));
create policy "family logs water" on public.water_entries
for insert to authenticated
with check (private.is_family_member(family_id) and created_by = (select auth.uid()));
create policy "family corrects water" on public.water_entries
for update to authenticated
using (private.is_family_member(family_id))
with check (private.is_family_member(family_id));
create policy "family deletes water" on public.water_entries
for delete to authenticated
using (private.is_family_member(family_id));

create policy "family reads memories" on public.memories
for select to authenticated
using (private.is_family_member(family_id));
create policy "family creates memories" on public.memories
for insert to authenticated
with check (private.is_family_member(family_id) and created_by = (select auth.uid()));
create policy "family updates memories" on public.memories
for update to authenticated
using (private.is_family_member(family_id))
with check (private.is_family_member(family_id));
create policy "family deletes memories" on public.memories
for delete to authenticated
using (private.is_family_member(family_id));

revoke all on table public.profiles, public.families, public.family_members,
  public.events, public.water_entries, public.memories from anon;
revoke all on table public.profiles, public.families, public.family_members,
  public.events, public.water_entries, public.memories from authenticated;

grant select on public.profiles, public.families, public.family_members,
  public.events, public.water_entries, public.memories to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant update (name) on public.families to authenticated;
grant update (display_name, color) on public.family_members to authenticated;
grant delete on public.families, public.family_members to authenticated;

grant insert on public.events, public.water_entries, public.memories to authenticated;
grant delete on public.events, public.water_entries, public.memories to authenticated;
grant update (
  title, kind, starts_at, subject_member_id, location, notes, reminder_minutes,
  medication_mode, medication_time, medication_duration_days,
  medication_interval_hours, medication_total_doses
) on public.events to authenticated;
grant update (amount_ml, subject_member_id) on public.water_entries to authenticated;
grant update (title, caption) on public.memories to authenticated;

alter table public.family_members replica identity full;
alter table public.events replica identity full;
alter table public.water_entries replica identity full;
alter table public.memories replica identity full;

do $$
declare
  table_name_to_add text;
begin
  foreach table_name_to_add in array array['families', 'family_members', 'events', 'water_entries', 'memories']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name_to_add
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name_to_add);
    end if;
  end loop;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'family-memories',
  'family-memories',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.memory_object_family_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

revoke all on function private.memory_object_family_id(text) from public, anon, authenticated;
grant execute on function private.memory_object_family_id(text) to authenticated;

create policy "family reads memory files" on storage.objects
for select to authenticated
using (
  bucket_id = 'family-memories'
  and private.is_family_member(private.memory_object_family_id(name))
);

create policy "family uploads memory files" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'family-memories'
  and private.is_family_member(private.memory_object_family_id(name))
);

create policy "family deletes memory files" on storage.objects
for delete to authenticated
using (
  bucket_id = 'family-memories'
  and private.is_family_member(private.memory_object_family_id(name))
);

commit;
