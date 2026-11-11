-- When someone takes over a placeholder driver, they also take its username
-- (their own was given a number suffix because the placeholder held the name).
create or replace function private.merge_profile(p_from uuid, p_into uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_name public.profiles.username%type;
begin
  if p_from = p_into then return; end if;
  select username into v_name from public.profiles where id = p_from;
  update public.laps set driver_id = p_into where driver_id = p_from;
  update public.tracks set created_by = p_into where created_by = p_from;
  update public.cars set created_by = p_into where created_by = p_from;
  insert into public.crew_members (crew_id, profile_id)
    select crew_id, p_into from public.crew_members where profile_id = p_from
    on conflict do nothing;
  update public.crews set owner_id = p_into where owner_id = p_from;
  delete from public.profiles where id = p_from;
  update public.profiles set username = v_name
   where id = p_into and username::text ~ ('^' || v_name::text || '[0-9]+$');
end;
$$;
