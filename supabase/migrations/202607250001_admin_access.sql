-- Admin access is verified by the server with the service-role key.
-- No browser/client policy is granted for this table.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'manager' check (role in ('superadmin', 'manager')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at before update on public.admin_users
for each row execute function public.set_updated_at();

comment on table public.admin_users is
  'Supabase Auth users allowed to use the Oceanman management panel.';

create table if not exists public.email_settings (
  singleton boolean primary key default true check (singleton),
  provider text not null default 'resend' check (provider in ('resend')),
  from_name text not null default 'Oceanman Edirne',
  from_email text not null default '',
  reply_to text not null default '',
  notification_email text not null default '',
  api_key_encrypted text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_settings enable row level security;
revoke all on table public.email_settings from anon, authenticated;

drop trigger if exists email_settings_set_updated_at on public.email_settings;
create trigger email_settings_set_updated_at before update on public.email_settings
for each row execute function public.set_updated_at();

insert into public.email_settings (singleton)
values (true)
on conflict (singleton) do nothing;

comment on table public.email_settings is
  'Email delivery configuration. api_key_encrypted is encrypted by the application before storage.';
