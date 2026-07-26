-- Global online-booking switch. It is read and changed only by server routes
-- using the service-role key; authenticated browser users receive no direct access.

create table if not exists public.business_settings (
  singleton boolean primary key default true check (singleton),
  booking_enabled boolean not null default true,
  booking_phone_display text not null default '0 540 236 00 66',
  booking_phone_href text not null default '+905402360066',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_settings enable row level security;
revoke all on table public.business_settings from anon, authenticated;

drop trigger if exists business_settings_set_updated_at on public.business_settings;
create trigger business_settings_set_updated_at before update on public.business_settings
for each row execute function public.set_updated_at();

insert into public.business_settings (singleton)
values (true)
on conflict (singleton) do nothing;

comment on table public.business_settings is
  'Global operational settings managed from the Oceanman admin panel.';
