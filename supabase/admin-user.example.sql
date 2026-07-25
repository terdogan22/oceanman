-- 1) Önce Supabase Dashboard > Authentication > Users bölümünden kullanıcı oluşturun.
-- 2) Aşağıdaki e-posta adresini değiştirip bu sorguyu SQL Editor içinde çalıştırın.

insert into public.admin_users (user_id, display_name, role, active)
select id, 'Tolga Erdoğan', 'superadmin', true
from auth.users
where lower(email) = lower('SUPERADMIN_EPOSTANIZ')
on conflict (user_id) do update
set display_name = excluded.display_name, role = 'superadmin', active = true;
