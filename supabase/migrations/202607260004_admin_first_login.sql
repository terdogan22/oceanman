alter table public.admin_users
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_changed_at timestamptz;

comment on column public.admin_users.must_change_password is
  'True iken kullanıcı yalnızca ilk giriş şifresini değiştirebilir.';
