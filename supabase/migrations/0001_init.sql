-- Laptimes: initial schema
create extension if not exists citext;

create schema if not exists private;

-- ---------- enums ----------
create type public.input_device as enum ('wheel', 'controller', 'keyboard');
create type public.lap_file_kind as enum ('ghost', 'setup', 'replay', 'screenshot', 'other');
create type public.request_status as enum ('pending', 'approved', 'rejected');

-- ---------- profiles ----------
-- A profile is a driver. Real users have id = auth.users.id.
-- Placeholder drivers (imported from the spreadsheet) have a random id and
-- is_placeholder = true until the real person signs up and claims them.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  username citext not null unique
    check (username ~ '^[a-z0-9_]{2,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  is_placeholder boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- catalogue ----------
create table public.sims (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  sort smallint not null default 100
);

create table public.tracks (
  id bigint generated always as identity primary key,
  sim_id smallint not null references public.sims(id),
  name text not null check (char_length(name) between 2 and 80),
  layout text not null default '' check (char_length(layout) <= 60),
  country text,
  length_m integer check (length_m > 0),
  ac_folder text check (ac_folder ~ '^[A-Za-z0-9_.\-]{1,80}$'),
  ac_layout text check (ac_layout ~ '^[A-Za-z0-9_.\-]{1,80}$'),
  is_mod boolean not null default false,
  download_url text check (download_url ~ '^https?://'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index tracks_unique_name on public.tracks (sim_id, lower(name), lower(layout));

create table public.cars (
  id bigint generated always as identity primary key,
  sim_id smallint not null references public.sims(id),
  name text not null check (char_length(name) between 2 and 80),
  brand text,
  class text check (char_length(class) <= 30),
  ac_folder text check (ac_folder ~ '^[A-Za-z0-9_.\-]{1,80}$'),
  is_mod boolean not null default false,
  download_url text check (download_url ~ '^https?://'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index cars_unique_name on public.cars (sim_id, lower(name));

-- ---------- laps ----------
create table public.laps (
  id bigint generated always as identity primary key,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  track_id bigint not null references public.tracks(id) on delete restrict,
  car_id bigint not null references public.cars(id) on delete restrict,
  time_ms integer not null check (time_ms between 5000 and 3600000),
  s1_ms integer check (s1_ms > 0),
  s2_ms integer check (s2_ms > 0),
  s3_ms integer check (s3_ms > 0),
  set_on date, -- null = unknown (laps imported from the old spreadsheet)
  input_device public.input_device,
  tyre text check (char_length(tyre) <= 40),
  assist_tc boolean not null default false,
  assist_abs boolean not null default false,
  assist_sc boolean not null default false,
  assist_line boolean not null default false,
  assist_auto boolean not null default false,
  track_temp_c smallint check (track_temp_c between -20 and 80),
  notes text check (char_length(notes) <= 500),
  proof_url text check (proof_url ~ '^https?://'),
  has_files boolean not null default false,
  is_verified boolean generated always as (has_files or proof_url is not null) stored,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index laps_combo_time on public.laps (track_id, car_id, time_ms);
create index laps_driver on public.laps (driver_id, created_at desc);
create index laps_car on public.laps (car_id);
create index laps_created on public.laps (created_at desc);

create table public.lap_files (
  id bigint generated always as identity primary key,
  lap_id bigint not null references public.laps(id) on delete cascade,
  kind public.lap_file_kind not null,
  storage_path text not null unique,
  filename text not null check (char_length(filename) between 1 and 200),
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index lap_files_lap on public.lap_files (lap_id);
create index lap_files_uploader on public.lap_files (uploaded_by);

-- ---------- crews ----------
create table public.crews (
  id bigint generated always as identity primary key,
  slug citext not null unique check (slug ~ '^[a-z0-9\-]{2,32}$'),
  name text not null check (char_length(name) between 2 and 40),
  invite_code text not null unique default encode(extensions.gen_random_bytes(5), 'hex'),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index crews_owner on public.crews (owner_id);

create table public.crew_members (
  crew_id bigint not null references public.crews(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (crew_id, profile_id)
);
create index crew_members_profile on public.crew_members (profile_id);

-- ---------- moderation ----------
create table public.reports (
  id bigint generated always as identity primary key,
  lap_id bigint not null references public.laps(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 300),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lap_id, reporter_id)
);
create index reports_reporter on public.reports (reporter_id);

create table public.claim_requests (
  id bigint generated always as identity primary key,
  placeholder_id uuid not null references public.profiles(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (placeholder_id, claimant_id)
);
create index claim_requests_claimant on public.claim_requests (claimant_id);

-- Emails that get something automatically at sign-up (admin role and/or a
-- placeholder driver handed over). Lives in a schema the API cannot reach.
create table private.signup_grants (
  email citext primary key,
  make_admin boolean not null default false,
  claim_profile_id uuid references public.profiles(id) on delete set null
);

-- ---------- helper functions ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false);
$$;

create or replace function private.merge_profile(p_from uuid, p_into uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_from = p_into then return; end if;
  update public.laps set driver_id = p_into where driver_id = p_from;
  update public.tracks set created_by = p_into where created_by = p_from;
  update public.cars set created_by = p_into where created_by = p_from;
  insert into public.crew_members (crew_id, profile_id)
    select crew_id, p_into from public.crew_members where profile_id = p_from
    on conflict do nothing;
  update public.crews set owner_id = p_into where owner_id = p_from;
  delete from public.profiles where id = p_from;
end;
$$;

-- New auth user -> profile (+ any pre-arranged grant)
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_base text;
  v_username text;
  v_display text;
  v_grant private.signup_grants;
  n int := 0;
begin
  v_base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(v_base) < 2 then v_base := 'driver'; end if;
  v_base := left(v_base, 20);
  v_username := v_base;
  while exists (select 1 from public.profiles where username = v_username) loop
    n := n + 1;
    v_username := v_base || n::text;
  end loop;
  v_display := left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), v_base), 40);

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display);

  select * into v_grant from private.signup_grants where email = new.email;
  if found then
    if v_grant.make_admin then
      update public.profiles set is_admin = true where id = new.id;
    end if;
    if v_grant.claim_profile_id is not null then
      perform private.merge_profile(v_grant.claim_profile_id, new.id);
    end if;
    delete from private.signup_grants where email = new.email;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Deleting an account removes its driver profile (and, by cascade, its laps).
create or replace function private.handle_user_deleted()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end;
$$;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function private.handle_user_deleted();

-- Users cannot promote themselves or flip the placeholder flag.
create or replace function private.protect_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  if (select auth.uid()) is not null and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.is_placeholder := old.is_placeholder;
    new.id := old.id;
  end if;
  return new;
end;
$$;
create trigger profiles_protect before update on public.profiles
  for each row execute function private.protect_profile();

-- Keep laps.has_files in sync
create or replace function private.sync_has_files()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_lap bigint := coalesce(new.lap_id, old.lap_id);
begin
  update public.laps l
     set has_files = exists (select 1 from public.lap_files f where f.lap_id = v_lap)
   where l.id = v_lap;
  return null;
end;
$$;
create trigger lap_files_sync after insert or delete on public.lap_files
  for each row execute function private.sync_has_files();

-- ---------- RPCs ----------
create or replace function public.join_crew(p_code text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare v_crew public.crews;
begin
  if (select auth.uid()) is null then raise exception 'Sign in first'; end if;
  select * into v_crew from public.crews where invite_code = lower(trim(p_code));
  if not found then raise exception 'No crew with that invite code'; end if;
  insert into public.crew_members (crew_id, profile_id)
  values (v_crew.id, (select auth.uid())) on conflict do nothing;
  return v_crew.slug::text;
end;
$$;

create or replace function public.resolve_claim(p_request_id bigint, p_approve boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_req public.claim_requests;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_req from public.claim_requests where id = p_request_id and status = 'pending';
  if not found then raise exception 'Request not found'; end if;
  if p_approve then
    if not exists (select 1 from public.profiles where id = v_req.placeholder_id and is_placeholder) then
      raise exception 'That driver is not a placeholder';
    end if;
    perform private.merge_profile(v_req.placeholder_id, v_req.claimant_id);
  else
    update public.claim_requests set status = 'rejected' where id = p_request_id;
  end if;
end;
$$;

revoke execute on function public.join_crew(text) from public, anon;
revoke execute on function public.resolve_claim(bigint, boolean) from public, anon;
grant execute on function public.join_crew(text) to authenticated;
grant execute on function public.resolve_claim(bigint, boolean) to authenticated;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- views ----------
-- Best visible lap per driver per combo.
create view public.best_laps with (security_invoker = true) as
select distinct on (l.driver_id, l.track_id, l.car_id) l.*
from public.laps l
where not l.is_hidden
order by l.driver_id, l.track_id, l.car_id, l.time_ms, l.created_at;

-- Fastest lap per combo, with how many drivers have set a time.
create view public.combo_records with (security_invoker = true) as
select distinct on (b.track_id, b.car_id)
  b.track_id, b.car_id, b.id as lap_id, b.driver_id, b.time_ms, b.set_on, b.is_verified,
  count(*) over (partition by b.track_id, b.car_id) as driver_count
from public.best_laps b
order by b.track_id, b.car_id, b.time_ms, b.created_at;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.sims enable row level security;
alter table public.tracks enable row level security;
alter table public.cars enable row level security;
alter table public.laps enable row level security;
alter table public.lap_files enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.reports enable row level security;
alter table public.claim_requests enable row level security;
alter table private.signup_grants enable row level security;

-- profiles: public read, self/admin write
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using ((select public.is_admin()) and is_placeholder);

-- catalogue: public read, any signed-in user can add, admin can fix
create policy sims_read on public.sims for select using (true);
create policy tracks_read on public.tracks for select using (true);
create policy tracks_insert on public.tracks for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy tracks_update on public.tracks for update to authenticated
  using ((select public.is_admin()) or created_by = (select auth.uid()))
  with check ((select public.is_admin()) or created_by = (select auth.uid()));
create policy tracks_delete on public.tracks for delete to authenticated
  using ((select public.is_admin()));
create policy cars_read on public.cars for select using (true);
create policy cars_insert on public.cars for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy cars_update on public.cars for update to authenticated
  using ((select public.is_admin()) or created_by = (select auth.uid()))
  with check ((select public.is_admin()) or created_by = (select auth.uid()));
create policy cars_delete on public.cars for delete to authenticated
  using ((select public.is_admin()));

-- laps: public read (hidden ones only for owner/admin), owner write
create policy laps_read on public.laps for select
  using (not is_hidden or driver_id = (select auth.uid()) or (select public.is_admin()));
create policy laps_insert on public.laps for insert to authenticated
  with check (driver_id = (select auth.uid()) and not is_hidden);
create policy laps_update on public.laps for update to authenticated
  using (driver_id = (select auth.uid()) or (select public.is_admin()))
  with check ((driver_id = (select auth.uid()) and not is_hidden) or (select public.is_admin()));
create policy laps_delete on public.laps for delete to authenticated
  using (driver_id = (select auth.uid()) or (select public.is_admin()));

-- lap files: public read, only the lap's driver can attach
create policy lap_files_read on public.lap_files for select using (true);
create policy lap_files_insert on public.lap_files for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and storage_path like (select auth.uid())::text || '/%'
    and exists (select 1 from public.laps l where l.id = lap_id and l.driver_id = (select auth.uid()))
  );
create policy lap_files_delete on public.lap_files for delete to authenticated
  using (uploaded_by = (select auth.uid()) or (select public.is_admin()));

-- crews: public read; owner manages; members join via join_crew() and can leave
create policy crews_read on public.crews for select using (true);
create policy crews_insert on public.crews for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy crews_update on public.crews for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy crews_delete on public.crews for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy crew_members_read on public.crew_members for select using (true);
create policy crew_members_insert on public.crew_members for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (select 1 from public.crews c where c.id = crew_id and c.owner_id = (select auth.uid()))
  );
create policy crew_members_delete on public.crew_members for delete to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (select 1 from public.crews c where c.id = crew_id and c.owner_id = (select auth.uid()))
  );

-- reports: reporter creates, admin reads/resolves
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy reports_update on public.reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- claim requests
create policy claims_insert on public.claim_requests for insert to authenticated
  with check (claimant_id = (select auth.uid()) and status = 'pending');
create policy claims_read on public.claim_requests for select to authenticated
  using (claimant_id = (select auth.uid()) or (select public.is_admin()));

-- Invite codes are only for members: hide the column from the public API
-- and expose it through a membership-checked function instead.
revoke select on public.crews from anon, authenticated;
grant select (id, slug, name, owner_id, created_at) on public.crews to anon, authenticated;

create or replace function public.crew_invite_code(p_crew_id bigint)
returns text
language sql stable security definer set search_path = ''
as $$
  select c.invite_code from public.crews c
  where c.id = p_crew_id
    and exists (select 1 from public.crew_members m
                where m.crew_id = c.id and m.profile_id = (select auth.uid()));
$$;
revoke execute on function public.crew_invite_code(bigint) from public, anon;
grant execute on function public.crew_invite_code(bigint) to authenticated;

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('lap-files', 'lap-files', true, 52428800)
on conflict (id) do nothing;

create policy lap_files_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'lap-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Needed so owners can delete their own uploads (public downloads don't use this).
create policy lap_files_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'lap-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy lap_files_remove on storage.objects for delete to authenticated
  using (bucket_id = 'lap-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- seed: sims ----------
insert into public.sims (slug, name, sort) values
  ('ac', 'Assetto Corsa', 1),
  ('acc', 'Assetto Corsa Competizione', 2),
  ('ac-evo', 'Assetto Corsa EVO', 3),
  ('iracing', 'iRacing', 4),
  ('lmu', 'Le Mans Ultimate', 5),
  ('ams2', 'Automobilista 2', 6),
  ('rf2', 'rFactor 2', 7),
  ('f1', 'F1 (EA Sports)', 8),
  ('gt7', 'Gran Turismo 7', 9),
  ('other', 'Other', 99);
