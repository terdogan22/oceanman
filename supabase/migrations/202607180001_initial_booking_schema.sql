-- Oceanman appointment MVP
-- All future schema changes should be added as new migration files.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

do $$ begin
  create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null;
end $$;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('hair', 'care', 'solar')),
  name text not null,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null default '',
  initials text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_services (
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (staff_id, service_id)
);

create table public.business_hours (
  id bigint generated always as identity primary key,
  staff_id uuid references public.staff(id) on delete cascade,
  iso_weekday smallint not null check (iso_weekday between 1 and 7),
  opens_at time not null,
  closes_at time not null,
  active boolean not null default true,
  check (opens_at < closes_at),
  unique nulls not distinct (staff_id, iso_weekday)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id),
  staff_id uuid not null references public.staff(id),
  customer_first_name text not null,
  customer_last_name text not null,
  customer_phone text not null,
  customer_email text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.appointment_status not null default 'confirmed',
  source text not null default 'web' check (source in ('web', 'admin', 'google')),
  google_calendar_id text,
  google_event_id text,
  privacy_accepted_at timestamptz not null default now(),
  cancellation_token_hash text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_at < end_at)
);

-- PostgreSQL prevents two active appointments from overlapping, even when
-- simultaneous requests reach different application instances.
alter table public.appointments
  add constraint appointments_no_staff_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'));

create unique index appointments_google_event_unique
  on public.appointments (google_calendar_id, google_event_id)
  where google_event_id is not null;

create index appointments_staff_start_idx on public.appointments (staff_id, start_at);
create index appointments_customer_phone_idx on public.appointments (customer_phone);

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  source text not null default 'google' check (source in ('google', 'admin')),
  external_event_id text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_at < end_at)
);

alter table public.calendar_blocks
  add constraint calendar_blocks_no_staff_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  );

create unique index calendar_blocks_external_unique
  on public.calendar_blocks (staff_id, external_event_id)
  where external_event_id is not null;

create table public.calendar_sync_states (
  staff_id uuid primary key references public.staff(id) on delete cascade,
  calendar_id text not null,
  sync_token text,
  channel_id text,
  resource_id text,
  channel_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.calendar_sync_states is
  'OAuth refresh tokens are intentionally not stored here; use a secret manager or Supabase Vault.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger staff_set_updated_at before update on public.staff
for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
for each row execute function public.set_updated_at();
create trigger calendar_blocks_set_updated_at before update on public.calendar_blocks
for each row execute function public.set_updated_at();
create trigger calendar_sync_states_set_updated_at before update on public.calendar_sync_states
for each row execute function public.set_updated_at();

create or replace function public.create_public_appointment(
  p_service_id uuid,
  p_staff_id uuid,
  p_start_at timestamptz,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_phone text,
  p_customer_email text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_duration integer;
  v_end_at timestamptz;
  v_appointment_id uuid;
  v_local_start timestamp;
  v_local_end timestamp;
  v_open time;
  v_close time;
begin
  if p_start_at < now() + interval '30 minutes' then
    raise exception 'Geçmiş veya çok yakın saat için randevu oluşturulamaz';
  end if;

  if length(trim(p_customer_first_name)) < 2
     or length(trim(p_customer_last_name)) < 2
     or length(regexp_replace(p_customer_phone, '[^0-9]', '', 'g')) < 10
     or position('@' in p_customer_email) < 2 then
    raise exception 'Müşteri bilgileri geçersiz';
  end if;

  select s.duration_minutes into v_duration
  from public.services s
  join public.staff_services ss on ss.service_id = s.id
  join public.staff st on st.id = ss.staff_id
  where s.id = p_service_id and ss.staff_id = p_staff_id and s.active and st.active;

  if v_duration is null then
    raise exception 'Seçilen hizmet ve personel eşleşmesi geçersiz';
  end if;

  v_end_at := p_start_at + make_interval(mins => v_duration);
  v_local_start := p_start_at at time zone 'Europe/Istanbul';
  v_local_end := v_end_at at time zone 'Europe/Istanbul';

  select bh.opens_at, bh.closes_at into v_open, v_close
  from public.business_hours bh
  where (bh.staff_id = p_staff_id or bh.staff_id is null)
    and bh.iso_weekday = extract(isodow from v_local_start)
    and bh.active
  order by bh.staff_id nulls last
  limit 1;

  if v_open is null or v_local_start::time < v_open or v_local_end::time > v_close
     or v_local_start::date <> v_local_end::date then
    raise exception 'Seçilen saat çalışma aralığı dışında';
  end if;

  if exists (
    select 1 from public.calendar_blocks cb
    where cb.staff_id = p_staff_id
      and tstzrange(cb.start_at, cb.end_at, '[)') && tstzrange(p_start_at, v_end_at, '[)')
  ) then
    raise exception 'Seçilen personel bu saatte müsait değil';
  end if;

  insert into public.appointments (
    service_id, staff_id, customer_first_name, customer_last_name,
    customer_phone, customer_email, start_at, end_at, status, source
  ) values (
    p_service_id, p_staff_id, trim(p_customer_first_name), trim(p_customer_last_name),
    trim(p_customer_phone), lower(trim(p_customer_email)), p_start_at, v_end_at, 'confirmed', 'web'
  ) returning id into v_appointment_id;

  return v_appointment_id;
end;
$$;

alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.staff_services enable row level security;
alter table public.business_hours enable row level security;
alter table public.appointments enable row level security;
alter table public.calendar_blocks enable row level security;
alter table public.calendar_sync_states enable row level security;

create policy "Public can read active services" on public.services
  for select to anon, authenticated using (active = true);
create policy "Public can read active staff" on public.staff
  for select to anon, authenticated using (active = true);
create policy "Public can read staff service mapping" on public.staff_services
  for select to anon, authenticated using (true);
create policy "Public can read business hours" on public.business_hours
  for select to anon, authenticated using (active = true);

revoke all on function public.create_public_appointment(uuid, uuid, timestamptz, text, text, text, text) from public;
grant execute on function public.create_public_appointment(uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

insert into public.services (id, category, name, description, duration_minutes, price_cents, sort_order) values
  ('10000000-0000-4000-8000-000000000001', 'hair', 'Saç Kesimi', 'Yüz hattına özel kesim ve şekillendirme', 45, 60000, 10),
  ('10000000-0000-4000-8000-000000000002', 'hair', 'Saç + Sakal', 'Komple kesim, sakal tasarımı ve son dokunuş', 60, 85000, 20),
  ('10000000-0000-4000-8000-000000000003', 'hair', 'Sakal Tasarımı', 'Sıcak havlu, kontur ve bakım', 30, 35000, 30),
  ('10000000-0000-4000-8000-000000000004', 'care', 'Premium Cilt Bakımı', 'Temizleme, peeling ve nem bakımı', 45, 75000, 40),
  ('10000000-0000-4000-8000-000000000005', 'care', 'Yüz Epilasyon', 'Profesyonel cihazla kontrollü uygulama', 30, 50000, 50),
  ('10000000-0000-4000-8000-000000000006', 'solar', 'Solaryum Seansı', 'Cilt tipine uygun kontrollü seans', 20, 45000, 60)
on conflict (id) do update set name = excluded.name, description = excluded.description,
  duration_minutes = excluded.duration_minutes, price_cents = excluded.price_cents, sort_order = excluded.sort_order;

insert into public.staff (id, name, title, initials, sort_order) values
  ('20000000-0000-4000-8000-000000000001', 'Erdem Kaçan', 'Senior Barber', 'EK', 10),
  ('20000000-0000-4000-8000-000000000002', 'Emrah Ak', 'Style Director', 'EA', 20),
  ('20000000-0000-4000-8000-000000000003', 'Yunus Taş', 'Barber & Care', 'YT', 30)
on conflict (id) do update set name = excluded.name, title = excluded.title, initials = excluded.initials, sort_order = excluded.sort_order;

insert into public.staff_services (staff_id, service_id)
select st.id, sv.id
from public.staff st cross join public.services sv
where st.id in (
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000003'
) or (st.id = '20000000-0000-4000-8000-000000000002' and sv.category <> 'solar')
on conflict do nothing;

insert into public.business_hours (staff_id, iso_weekday, opens_at, closes_at)
select null, day, time '09:00', time '20:00' from generate_series(1, 7) as day
on conflict (staff_id, iso_weekday) do update set opens_at = excluded.opens_at, closes_at = excluded.closes_at;
