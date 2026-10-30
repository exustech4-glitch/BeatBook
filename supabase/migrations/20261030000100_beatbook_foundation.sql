create extension if not exists pgcrypto;

do $$ begin
  create type public.account_role as enum ('ARTIST', 'CLIENT');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role public.account_role not null default 'CLIENT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := upper(coalesce(new.raw_user_meta_data ->> 'account_role', 'CLIENT'));
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    case when requested_role = 'ARTIST' then 'ARTIST'::public.account_role else 'CLIENT'::public.account_role end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.artist_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text not null default '',
  booking_slug text not null unique,
  profile_image_url text,
  description text not null default '',
  contact_email text not null,
  phone text,
  business_location text not null default 'Lagos, Nigeria',
  timezone text not null default 'Africa/Lagos',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_slug_format check (booking_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint artist_timezone_nonempty check (length(trim(timezone)) > 0)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(user_id) on delete cascade,
  name text not null,
  description text not null default '',
  price_ngn integer not null check (price_ngn >= 0),
  duration_minutes integer not null check (duration_minutes between 15 and 1440),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_name_nonempty check (length(trim(name)) > 0)
);
create index if not exists services_artist_active_idx on public.services (artist_id, active);

create table if not exists public.working_hours (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opening_time time not null default '09:00',
  closing_time time not null default '17:00',
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, weekday),
  constraint working_hours_order check (is_closed or opening_time < closing_time)
);

create table if not exists public.travel_areas (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(user_id) on delete cascade,
  name text not null,
  fee_ngn integer not null check (fee_ngn >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travel_area_name_nonempty check (length(trim(name)) > 0),
  unique (artist_id, name)
);

create table if not exists public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(user_id) on delete cascade,
  exception_date date not null,
  starts_at time,
  ends_at time,
  exception_type text not null check (exception_type in ('BREAK', 'BLOCKED', 'OVERRIDE')),
  description text,
  created_at timestamptz not null default now(),
  constraint exception_time_pair check ((starts_at is null and ends_at is null) or (starts_at is not null and ends_at is not null and starts_at < ends_at))
);
create index if not exists availability_exceptions_artist_date_idx on public.availability_exceptions (artist_id, exception_date);

create table if not exists public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(user_id) on delete cascade,
  version integer not null check (version > 0),
  cancellation_terms text not null default '',
  refund_terms text not null default '',
  deposit_type text not null check (deposit_type in ('PERCENTAGE', 'FIXED')),
  deposit_value integer not null check (deposit_value >= 0),
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (artist_id, version),
  constraint deposit_percentage_range check (deposit_type <> 'PERCENTAGE' or deposit_value between 0 and 100)
);

create or replace function public.artist_owner_exists(target_artist uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_artist and p.id = (select auth.uid()) and p.role = 'ARTIST'
  );
$$;

alter table public.profiles enable row level security;
alter table public.artist_profiles enable row level security;
alter table public.services enable row level security;
alter table public.working_hours enable row level security;
alter table public.travel_areas enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.policy_versions enable row level security;

revoke all on public.profiles, public.artist_profiles, public.services, public.working_hours,
  public.travel_areas, public.availability_exceptions, public.policy_versions from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, delete on public.artist_profiles to authenticated;
grant insert (user_id, business_name, booking_slug, profile_image_url, description, contact_email, phone, business_location, timezone)
  on public.artist_profiles to authenticated;
grant update (business_name, booking_slug, profile_image_url, description, contact_email, phone, business_location, timezone)
  on public.artist_profiles to authenticated;
grant select, insert, update, delete on public.services, public.working_hours,
  public.travel_areas, public.availability_exceptions, public.policy_versions to authenticated;
grant select on public.artist_profiles, public.services, public.working_hours,
  public.travel_areas, public.policy_versions to anon;
grant usage on type public.account_role to authenticated;

create policy "profiles_read_self" on public.profiles for select to authenticated
  using ((select auth.uid()) is not null and id = (select auth.uid()));
create policy "profiles_update_self" on public.profiles for update to authenticated
  using ((select auth.uid()) is not null and id = (select auth.uid()))
  with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "artist_profiles_public_read" on public.artist_profiles for select to anon, authenticated
  using (is_published or user_id = (select auth.uid()));
create policy "artist_profiles_artist_insert" on public.artist_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and public.artist_owner_exists(user_id));
create policy "artist_profiles_artist_update" on public.artist_profiles for update to authenticated
  using (user_id = (select auth.uid()) and public.artist_owner_exists(user_id))
  with check (user_id = (select auth.uid()) and public.artist_owner_exists(user_id));
create policy "artist_profiles_artist_delete" on public.artist_profiles for delete to authenticated
  using (user_id = (select auth.uid()) and public.artist_owner_exists(user_id));

create policy "services_public_active_read" on public.services for select to anon, authenticated
  using (
    (active and exists (select 1 from public.artist_profiles ap where ap.user_id = artist_id and ap.is_published))
    or artist_id = (select auth.uid())
  );
create policy "services_artist_insert" on public.services for insert to authenticated
  with check (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "services_artist_update" on public.services for update to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id))
  with check (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "services_artist_delete" on public.services for delete to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));

create policy "working_hours_public_read" on public.working_hours for select to anon, authenticated
  using (exists (select 1 from public.artist_profiles ap where ap.user_id = artist_id and ap.is_published) or artist_id = (select auth.uid()));
create policy "working_hours_artist_insert" on public.working_hours for insert to authenticated
  with check (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "working_hours_artist_update" on public.working_hours for update to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id))
  with check (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "working_hours_artist_delete" on public.working_hours for delete to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));

create policy "travel_areas_public_active_read" on public.travel_areas for select to anon, authenticated
  using ((active and exists (select 1 from public.artist_profiles ap where ap.user_id = artist_id and ap.is_published)) or artist_id = (select auth.uid()));
create policy "travel_areas_artist_insert" on public.travel_areas for insert to authenticated
  with check (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "travel_areas_artist_update" on public.travel_areas for update to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id))
  with check (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "travel_areas_artist_delete" on public.travel_areas for delete to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));

create policy "availability_exceptions_artist_read" on public.availability_exceptions for select to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "availability_exceptions_artist_insert" on public.availability_exceptions for insert to authenticated
  with check (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "availability_exceptions_artist_update" on public.availability_exceptions for update to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id))
  with check (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "availability_exceptions_artist_delete" on public.availability_exceptions for delete to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));

create policy "policy_versions_public_read" on public.policy_versions for select to anon, authenticated
  using (exists (select 1 from public.artist_profiles ap where ap.user_id = artist_id and ap.is_published) or artist_id = (select auth.uid()));
create policy "policy_versions_artist_insert" on public.policy_versions for insert to authenticated
  with check (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "policy_versions_artist_update" on public.policy_versions for update to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id))
  with check (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));
create policy "policy_versions_artist_delete" on public.policy_versions for delete to authenticated
  using (artist_id = (select auth.uid()) and public.artist_owner_exists(artist_id));

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger artist_profiles_set_updated_at before update on public.artist_profiles
  for each row execute procedure public.set_updated_at();
create trigger services_set_updated_at before update on public.services
  for each row execute procedure public.set_updated_at();
create trigger working_hours_set_updated_at before update on public.working_hours
  for each row execute procedure public.set_updated_at();
create trigger travel_areas_set_updated_at before update on public.travel_areas
  for each row execute procedure public.set_updated_at();

