-- Replace the Resend API configuration with encrypted SMTP settings.
-- Legacy columns remain in place but are no longer read by the application.

alter table public.email_settings
  drop constraint if exists email_settings_provider_check;

alter table public.email_settings
  add column if not exists smtp_host text not null default '',
  add column if not exists smtp_port integer not null default 587,
  add column if not exists smtp_security text not null default 'starttls',
  add column if not exists smtp_username text not null default '',
  add column if not exists smtp_password_encrypted text;

alter table public.email_settings
  alter column provider set default 'smtp';

update public.email_settings
set provider = 'smtp'
where singleton = true;

alter table public.email_settings
  add constraint email_settings_provider_check check (provider in ('smtp')),
  add constraint email_settings_smtp_port_check check (smtp_port between 1 and 65535),
  add constraint email_settings_smtp_security_check check (smtp_security in ('starttls', 'tls', 'none'));

comment on column public.email_settings.smtp_password_encrypted is
  'SMTP password encrypted by the application with AES-256-GCM.';
