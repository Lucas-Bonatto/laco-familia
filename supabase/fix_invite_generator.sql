begin;

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

revoke all on function private.create_family_impl(text, text) from public, anon;
grant execute on function private.create_family_impl(text, text) to authenticated;

commit;
