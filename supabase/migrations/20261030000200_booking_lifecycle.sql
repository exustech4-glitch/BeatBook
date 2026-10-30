create extension if not exists btree_gist;

do $$ begin
  create type public.booking_status as enum (
    'PENDING_APPROVAL', 'REQUEST_EXPIRED', 'DECLINED', 'AWAITING_PAYMENT',
    'PAYMENT_EXPIRED', 'CONFIRMED', 'CANCELLATION_REQUESTED', 'CANCELLED',
    'RESCHEDULE_REQUESTED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED');
exception when duplicate_object then null; end $$;

alter table public.artist_profiles
  add column if not exists buffer_minutes integer not null default 15 check (buffer_minutes between 0 and 240);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  artist_id uuid not null references public.artist_profiles(user_id),
  service_id uuid not null references public.services(id),
  travel_area_id uuid references public.travel_areas(id) on delete set null,
  appointment_start timestamptz not null,
  appointment_end timestamptz not null,
  buffer_minutes_snapshot integer not null default 0 check (buffer_minutes_snapshot between 0 and 240),
  slot_range tstzrange not null,
  timezone_snapshot text not null,
  full_address text not null,
  service_name_snapshot text not null,
  service_price_snapshot integer not null check (service_price_snapshot >= 0),
  service_duration_snapshot integer not null check (service_duration_snapshot > 0),
  travel_area_name_snapshot text not null,
  travel_fee_snapshot integer not null check (travel_fee_snapshot >= 0),
  total_snapshot integer not null check (total_snapshot >= 0),
  deposit_type_snapshot text not null check (deposit_type_snapshot in ('PERCENTAGE', 'FIXED')),
  deposit_amount_snapshot integer not null check (deposit_amount_snapshot >= 0),
  remaining_balance_snapshot integer not null check (remaining_balance_snapshot >= 0),
  policy_version_id uuid references public.policy_versions(id) on delete set null,
  cancellation_policy_snapshot text not null default '',
  status public.booking_status not null default 'PENDING_APPROVAL',
  payment_status public.payment_status not null default 'PENDING',
  request_expires_at timestamptz not null default now() + interval '24 hours',
  reservation_expires_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_end_after_start check (appointment_end > appointment_start),
  constraint booking_no_active_overlap exclude using gist (artist_id with =, slot_range with &&)
    where (status in ('AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLATION_REQUESTED', 'RESCHEDULE_REQUESTED'))
);
create or replace function public.set_booking_slot_range()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.slot_range := tstzrange(
    new.appointment_start,
    new.appointment_end + make_interval(mins => new.buffer_minutes_snapshot),
    '[)'
  );
  return new;
end;
$$;
create trigger bookings_set_slot_range
before insert or update of appointment_start, appointment_end, buffer_minutes_snapshot
on public.bookings for each row execute function public.set_booking_slot_range();
create index bookings_client_recent_idx on public.bookings (client_id, created_at desc);
create index bookings_artist_schedule_idx on public.bookings (artist_id, appointment_start);
create index bookings_request_expiry_idx on public.bookings (request_expires_at) where status = 'PENDING_APPROVAL';
create index bookings_reservation_expiry_idx on public.bookings (reservation_expires_at) where status = 'AWAITING_PAYMENT';

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  client_id uuid not null references public.profiles(id),
  test_mode boolean not null default true check (test_mode),
  transaction_reference text not null unique,
  idempotency_key text not null unique,
  amount_ngn integer not null check (amount_ngn >= 0),
  status public.payment_status not null,
  outcome text not null check (outcome in ('SIMULATED_SUCCESS', 'SIMULATED_FAILURE', 'EXPIRED')),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  event_type text not null,
  message text not null,
  deduplication_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_unread_idx on public.notifications (recipient_id, created_at desc) where read_at is null;

create table public.cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  client_id uuid not null references public.profiles(id),
  reason text not null default '',
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'DECLINED')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table public.reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  client_id uuid not null references public.profiles(id),
  original_start timestamptz not null,
  original_end timestamptz not null,
  proposed_start timestamptz not null,
  proposed_end timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'DECLINED')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create or replace function public.notify_booking_parties(target_booking uuid, target_event text, target_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = target_booking;
  if not found then return; end if;
  insert into public.notifications (recipient_id, booking_id, event_type, message, deduplication_key)
    values (b.client_id, b.id, target_event, target_message, target_booking::text || ':' || target_event || ':' || b.client_id::text)
    on conflict (deduplication_key) do nothing;
  insert into public.notifications (recipient_id, booking_id, event_type, message, deduplication_key)
    values (b.artist_id, b.id, target_event, target_message, target_booking::text || ':' || target_event || ':' || b.artist_id::text)
    on conflict (deduplication_key) do nothing;
end;
$$;

create or replace function public.create_booking_request(
  p_artist_id uuid,
  p_service_id uuid,
  p_travel_area_id uuid,
  p_appointment_start timestamp without time zone,
  p_full_address text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  client_profile public.profiles%rowtype;
  artist public.artist_profiles%rowtype;
  svc public.services%rowtype;
  area public.travel_areas%rowtype;
  policy public.policy_versions%rowtype;
  local_start timestamp;
  local_end timestamp;
  utc_start timestamptz;
  total_amount integer;
  deposit_amount integer;
  new_booking uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to request an appointment.' using errcode = '42501'; end if;
  select * into client_profile from public.profiles where id = auth.uid();
  if client_profile.role <> 'CLIENT' then raise exception 'A client account is required.' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null) then
    raise exception 'Verify your email before requesting an appointment.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_full_address, ''))) < 8 then raise exception 'Enter a complete appointment address.'; end if;
  select * into artist from public.artist_profiles where user_id = p_artist_id and is_published;
  if not found then raise exception 'This booking page is unavailable.'; end if;
  if p_appointment_start <= (now() at time zone artist.timezone) then raise exception 'Choose a future appointment time.'; end if;
  select * into svc from public.services where id = p_service_id and artist_id = p_artist_id and active;
  if not found then raise exception 'This service is unavailable.'; end if;
  select * into area from public.travel_areas where id = p_travel_area_id and artist_id = p_artist_id and active;
  if not found then raise exception 'Choose an available travel area.'; end if;

  local_start := p_appointment_start;
  local_end := p_appointment_start + make_interval(mins => svc.duration_minutes);
  utc_start := p_appointment_start at time zone artist.timezone;
  if not exists (
    select 1 from public.working_hours wh
    where wh.artist_id = p_artist_id
      and wh.weekday = extract(dow from local_start)::smallint
      and not wh.is_closed
      and local_start::time >= wh.opening_time
      and local_end::time <= wh.closing_time
  ) then raise exception 'The selected time is outside the artist’s working hours.'; end if;
  if exists (
    select 1 from public.availability_exceptions ex
    where ex.artist_id = p_artist_id and ex.exception_date = local_start::date
      and ex.exception_type in ('BLOCKED', 'BREAK')
      and (ex.starts_at is null or (local_start::time < ex.ends_at and local_end::time > ex.starts_at))
  ) then raise exception 'The selected time is unavailable.'; end if;
  if exists (
    select 1 from public.bookings b
    where b.artist_id = p_artist_id and b.status in ('CONFIRMED', 'AWAITING_PAYMENT')
      and tstzrange(utc_start, utc_start + make_interval(mins => svc.duration_minutes + artist.buffer_minutes), '[)') && b.slot_range
  ) then raise exception 'That time has just been taken. Choose another time.'; end if;

  select * into policy from public.policy_versions
    where artist_id = p_artist_id and effective_at <= now() order by effective_at desc, version desc limit 1;
  total_amount := svc.price_ngn + area.fee_ngn;
  if found then
    deposit_amount := case when policy.deposit_type = 'PERCENTAGE' then ceil(total_amount * policy.deposit_value / 100.0)::integer else least(total_amount, policy.deposit_value) end;
  else
    deposit_amount := 0;
  end if;

  insert into public.bookings (
    client_id, artist_id, service_id, travel_area_id, appointment_start, appointment_end,
    buffer_minutes_snapshot, timezone_snapshot, full_address, service_name_snapshot,
    service_price_snapshot, service_duration_snapshot, travel_area_name_snapshot, travel_fee_snapshot,
    total_snapshot, deposit_type_snapshot, deposit_amount_snapshot, remaining_balance_snapshot,
    policy_version_id, cancellation_policy_snapshot
  ) values (
    auth.uid(), p_artist_id, p_service_id, p_travel_area_id, utc_start,
    utc_start + make_interval(mins => svc.duration_minutes), artist.buffer_minutes,
    artist.timezone, trim(p_full_address), svc.name, svc.price_ngn, svc.duration_minutes,
    area.name, area.fee_ngn, total_amount, coalesce(policy.deposit_type, 'FIXED'), deposit_amount,
    total_amount - deposit_amount, policy.id, coalesce(policy.cancellation_terms, '')
  ) returning id into new_booking;
  perform public.notify_booking_parties(new_booking, 'REQUEST_SUBMITTED', 'A new appointment request is waiting for review.');
  return new_booking;
end;
$$;

create or replace function public.decide_booking_request(p_booking_id uuid, p_approve boolean)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype; user_role public.account_role;
begin
  select role into user_role from public.profiles where id = auth.uid();
  if auth.uid() is null or user_role <> 'ARTIST' then raise exception 'Artist access required.' using errcode = '42501'; end if;
  select * into b from public.bookings where id = p_booking_id and artist_id = auth.uid() for update;
  if not found then raise exception 'Booking request not found.'; end if;
  if b.status <> 'PENDING_APPROVAL' or b.request_expires_at <= now() then
    update public.bookings set status = 'REQUEST_EXPIRED' where id = b.id and status = 'PENDING_APPROVAL';
    perform public.notify_booking_parties(b.id, 'REQUEST_EXPIRED', 'This booking request expired before it was reviewed.');
    select * into b from public.bookings where id = b.id;
    return b;
  end if;
  if not p_approve then
    update public.bookings set status = 'DECLINED' where id = b.id returning * into b;
    perform public.notify_booking_parties(b.id, 'REQUEST_DECLINED', 'The artist could not accept this appointment request.');
    return b;
  end if;
  begin
    update public.bookings
      set status = 'AWAITING_PAYMENT', reservation_expires_at = now() + interval '15 minutes'
      where id = b.id returning * into b;
  exception when exclusion_violation then
    raise exception 'That appointment time is no longer available.';
  end;
  perform public.notify_booking_parties(b.id, 'PAYMENT_REQUIRED', 'Your request was approved. Complete the test deposit within 15 minutes.');
  return b;
end;
$$;

create or replace function public.simulate_deposit(p_booking_id uuid, p_success boolean, p_idempotency_key text)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype; payment_id uuid; target_status public.payment_status; ref text;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.' using errcode = '42501'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 12 then raise exception 'Invalid payment reference.'; end if;
  select * into b from public.bookings where id = p_booking_id and client_id = auth.uid() for update;
  if not found then raise exception 'Booking not found.'; end if;
  if b.status = 'CONFIRMED' then return b; end if;
  if b.status <> 'AWAITING_PAYMENT' or b.reservation_expires_at is null or b.reservation_expires_at <= now() then
    update public.bookings set status = 'PAYMENT_EXPIRED', payment_status = 'EXPIRED' where id = b.id and status = 'AWAITING_PAYMENT' returning * into b;
    perform public.notify_booking_parties(b.id, 'PAYMENT_EXPIRED', 'The payment reservation expired. Request a new appointment time.');
    return b;
  end if;
  if exists (select 1 from public.payment_records where idempotency_key = p_idempotency_key) then
    select * into b from public.bookings where id = p_booking_id;
    return b;
  end if;
  target_status := case when p_success then 'SUCCEEDED'::public.payment_status else 'FAILED'::public.payment_status end;
  ref := 'TEST-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.payment_records (booking_id, client_id, test_mode, transaction_reference, idempotency_key, amount_ngn, status, outcome)
    values (b.id, auth.uid(), true, ref, p_idempotency_key, b.deposit_amount_snapshot, target_status,
      case when p_success then 'SIMULATED_SUCCESS' else 'SIMULATED_FAILURE' end) returning id into payment_id;
  if p_success then
    update public.bookings set status = 'CONFIRMED', payment_status = 'SUCCEEDED', confirmed_at = now() where id = b.id returning * into b;
    perform public.notify_booking_parties(b.id, 'PAYMENT_SUCCEEDED', 'The test deposit was recorded and the appointment is confirmed. No money was charged.');
  else
    update public.bookings set payment_status = 'FAILED' where id = b.id returning * into b;
    perform public.notify_booking_parties(b.id, 'PAYMENT_FAILED', 'The simulated deposit failed. The appointment is not confirmed.');
  end if;
  return b;
end;
$$;

create or replace function public.expire_booking_requests()
returns integer language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  update public.bookings set status = 'REQUEST_EXPIRED'
    where status = 'PENDING_APPROVAL' and request_expires_at <= now();
  get diagnostics affected = row_count;
  update public.bookings set status = 'PAYMENT_EXPIRED', payment_status = 'EXPIRED'
    where status = 'AWAITING_PAYMENT' and reservation_expires_at <= now();
  return affected;
end;
$$;

create or replace function public.publish_artist_profile()
returns public.artist_profiles
language plpgsql security definer set search_path = '' as $$
declare result public.artist_profiles%rowtype;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ARTIST') then
    raise exception 'Artist access required.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.artist_profiles ap where ap.user_id = auth.uid() and length(trim(ap.business_name)) >= 2 and length(trim(ap.description)) > 0) then
    raise exception 'Complete your business profile first.';
  end if;
  if not exists (select 1 from public.services s where s.artist_id = auth.uid() and s.active) then raise exception 'Add at least one active service.'; end if;
  if not exists (select 1 from public.working_hours h where h.artist_id = auth.uid() and not h.is_closed) then raise exception 'Set your weekly working hours.'; end if;
  if not exists (select 1 from public.travel_areas a where a.artist_id = auth.uid() and a.active) then raise exception 'Add at least one travel area.'; end if;
  if not exists (select 1 from public.policy_versions p where p.artist_id = auth.uid()) then raise exception 'Set your deposit and cancellation policy.'; end if;
  update public.artist_profiles set is_published = true where user_id = auth.uid() returning * into result;
  return result;
end;
$$;

create or replace function public.request_cancellation(p_booking_id uuid, p_reason text default '')
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = p_booking_id and client_id = auth.uid() for update;
  if not found or auth.uid() is null then raise exception 'Booking not found.' using errcode = '42501'; end if;
  if b.status <> 'CONFIRMED' then raise exception 'Only confirmed appointments can be cancelled.'; end if;
  insert into public.cancellation_requests (booking_id, client_id, reason)
    values (b.id, auth.uid(), left(trim(coalesce(p_reason, '')), 500));
  update public.bookings set status = 'CANCELLATION_REQUESTED' where id = b.id returning * into b;
  perform public.notify_booking_parties(b.id, 'CANCELLATION_REQUESTED', 'The client requested cancellation. The appointment stays reserved until you decide.');
  return b;
end;
$$;

create or replace function public.decide_cancellation(p_booking_id uuid, p_approve boolean)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype; req public.cancellation_requests%rowtype;
begin
  select * into b from public.bookings where id = p_booking_id and artist_id = auth.uid() for update;
  if not found or not exists (select 1 from public.profiles where id = auth.uid() and role = 'ARTIST') then raise exception 'Artist access required.' using errcode = '42501'; end if;
  if b.status <> 'CANCELLATION_REQUESTED' then raise exception 'No cancellation request is waiting for a decision.'; end if;
  select * into req from public.cancellation_requests where booking_id = b.id and status = 'PENDING' order by created_at desc limit 1 for update;
  if not found then raise exception 'Cancellation request not found.'; end if;
  update public.cancellation_requests set status = case when p_approve then 'APPROVED' else 'DECLINED' end, decided_at = now() where id = req.id;
  update public.bookings set status = case when p_approve then 'CANCELLED'::public.booking_status else 'CONFIRMED'::public.booking_status end where id = b.id returning * into b;
  perform public.notify_booking_parties(b.id, case when p_approve then 'CANCELLATION_APPROVED' else 'CANCELLATION_DECLINED' end,
    case when p_approve then 'The artist approved the cancellation.' else 'The artist declined the cancellation request. Your appointment remains confirmed.' end);
  return b;
end;
$$;

create or replace function public.request_reschedule(p_booking_id uuid, p_proposed_start timestamp without time zone)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype; artist public.artist_profiles%rowtype; local_end timestamp; proposed_utc timestamptz;
begin
  select * into b from public.bookings where id = p_booking_id and client_id = auth.uid() for update;
  if not found or auth.uid() is null then raise exception 'Booking not found.' using errcode = '42501'; end if;
  if b.status <> 'CONFIRMED' then raise exception 'Only confirmed appointments can be rescheduled.'; end if;
  select * into artist from public.artist_profiles where user_id = b.artist_id;
  if p_proposed_start <= now() at time zone artist.timezone then raise exception 'Choose a future appointment time.'; end if;
  local_end := p_proposed_start + make_interval(mins => b.service_duration_snapshot);
  proposed_utc := p_proposed_start at time zone artist.timezone;
  if not exists (select 1 from public.working_hours h where h.artist_id = b.artist_id and h.weekday = extract(dow from p_proposed_start)::smallint and not h.is_closed and p_proposed_start::time >= h.opening_time and local_end::time <= h.closing_time) then
    raise exception 'The selected time is outside the artist’s working hours.';
  end if;
  if exists (select 1 from public.availability_exceptions ex where ex.artist_id = b.artist_id and ex.exception_date = p_proposed_start::date and ex.exception_type in ('BLOCKED', 'BREAK') and (ex.starts_at is null or (p_proposed_start::time < ex.ends_at and local_end::time > ex.starts_at))) then
    raise exception 'The selected time is unavailable.';
  end if;
  if exists (select 1 from public.bookings other where other.artist_id = b.artist_id and other.id <> b.id and other.status in ('CONFIRMED','AWAITING_PAYMENT','CANCELLATION_REQUESTED','RESCHEDULE_REQUESTED') and tstzrange(proposed_utc, proposed_utc + make_interval(mins => b.service_duration_snapshot + b.buffer_minutes_snapshot), '[)') && other.slot_range) then
    raise exception 'The selected time is unavailable.';
  end if;
  insert into public.reschedule_requests (booking_id, client_id, original_start, original_end, proposed_start, proposed_end)
    values (b.id, auth.uid(), b.appointment_start, b.appointment_end, proposed_utc, proposed_utc + make_interval(mins => b.service_duration_snapshot));
  update public.bookings set status = 'RESCHEDULE_REQUESTED' where id = b.id returning * into b;
  perform public.notify_booking_parties(b.id, 'RESCHEDULE_REQUESTED', 'The client requested a new appointment time. Your current slot remains reserved.');
  return b;
end;
$$;

create or replace function public.decide_reschedule(p_booking_id uuid, p_approve boolean)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype; req public.reschedule_requests%rowtype;
begin
  select * into b from public.bookings where id = p_booking_id and artist_id = auth.uid() for update;
  if not found or not exists (select 1 from public.profiles where id = auth.uid() and role = 'ARTIST') then raise exception 'Artist access required.' using errcode = '42501'; end if;
  if b.status <> 'RESCHEDULE_REQUESTED' then raise exception 'No reschedule request is waiting for a decision.'; end if;
  select * into req from public.reschedule_requests where booking_id = b.id and status = 'PENDING' order by created_at desc limit 1 for update;
  if not found then raise exception 'Reschedule request not found.'; end if;
  if p_approve then
    begin
      update public.bookings set appointment_start = req.proposed_start, appointment_end = req.proposed_end, status = 'CONFIRMED' where id = b.id returning * into b;
      update public.reschedule_requests set status = 'APPROVED', decided_at = now() where id = req.id;
    exception when exclusion_violation then
      update public.reschedule_requests set status = 'DECLINED', decided_at = now() where id = req.id;
      update public.bookings set status = 'CONFIRMED' where id = b.id returning * into b;
      perform public.notify_booking_parties(b.id, 'RESCHEDULE_DECLINED', 'That time is no longer available. Your original appointment remains confirmed.');
      return b;
    end;
  else
    update public.reschedule_requests set status = 'DECLINED', decided_at = now() where id = req.id;
    update public.bookings set status = 'CONFIRMED' where id = b.id returning * into b;
  end if;
  perform public.notify_booking_parties(b.id, case when p_approve then 'RESCHEDULE_APPROVED' else 'RESCHEDULE_DECLINED' end,
    case when p_approve then 'The artist approved your new appointment time.' else 'The artist declined the change. Your original appointment remains confirmed.' end);
  return b;
end;
$$;

alter table public.bookings enable row level security;
alter table public.payment_records enable row level security;
alter table public.notifications enable row level security;
alter table public.cancellation_requests enable row level security;
alter table public.reschedule_requests enable row level security;
revoke all on public.bookings, public.payment_records, public.notifications from anon, authenticated;
revoke all on public.cancellation_requests, public.reschedule_requests from anon, authenticated;
grant select on public.bookings, public.payment_records, public.notifications to authenticated;
grant select on public.cancellation_requests, public.reschedule_requests to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "booking_parties_read" on public.bookings for select to authenticated
  using (client_id = (select auth.uid()) or artist_id = (select auth.uid()));
create policy "booking_party_profile_read" on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (select 1 from public.bookings b where b.client_id = id and b.artist_id = (select auth.uid()))
    or exists (select 1 from public.bookings b where b.artist_id = id and b.client_id = (select auth.uid()))
  );
create policy "payment_client_read" on public.payment_records for select to authenticated
  using (client_id = (select auth.uid()));
create policy "notification_owner_read" on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "notification_owner_update" on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy "cancellation_parties_read" on public.cancellation_requests for select to authenticated
  using (client_id = (select auth.uid()) or exists (select 1 from public.bookings b where b.id = booking_id and b.artist_id = (select auth.uid())));
create policy "reschedule_parties_read" on public.reschedule_requests for select to authenticated
  using (client_id = (select auth.uid()) or exists (select 1 from public.bookings b where b.id = booking_id and b.artist_id = (select auth.uid())));

revoke all on function public.create_booking_request(uuid, uuid, uuid, timestamp without time zone, text) from public, anon;
revoke all on function public.decide_booking_request(uuid, boolean) from public, anon;
revoke all on function public.simulate_deposit(uuid, boolean, text) from public, anon;
revoke all on function public.notify_booking_parties(uuid, text, text) from public, anon, authenticated;
revoke all on function public.expire_booking_requests() from public, anon, authenticated;
revoke all on function public.publish_artist_profile() from public, anon;
revoke all on function public.request_cancellation(uuid, text) from public, anon;
revoke all on function public.decide_cancellation(uuid, boolean) from public, anon;
revoke all on function public.request_reschedule(uuid, timestamp without time zone) from public, anon;
revoke all on function public.decide_reschedule(uuid, boolean) from public, anon;
grant execute on function public.create_booking_request(uuid, uuid, uuid, timestamp without time zone, text) to authenticated;
grant execute on function public.decide_booking_request(uuid, boolean) to authenticated;
grant execute on function public.simulate_deposit(uuid, boolean, text) to authenticated;
grant execute on function public.publish_artist_profile() to authenticated;
grant execute on function public.request_cancellation(uuid, text) to authenticated;
grant execute on function public.decide_cancellation(uuid, boolean) to authenticated;
grant execute on function public.request_reschedule(uuid, timestamp without time zone) to authenticated;
grant execute on function public.decide_reschedule(uuid, boolean) to authenticated;


