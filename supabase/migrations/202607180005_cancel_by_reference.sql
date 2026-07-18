alter table public.appointments
  add column if not exists cancellation_code_hash text;

create or replace function public.create_public_appointment_v3(
  p_service_id uuid,
  p_staff_id uuid,
  p_start_at timestamptz,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_phone text,
  p_customer_email text
)
returns table (appointment_id uuid, cancellation_token text, cancellation_code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_token text;
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select created.appointment_id, created.cancellation_token
  into v_id, v_token
  from public.create_public_appointment_v2(
    p_service_id,
    p_staff_id,
    p_start_at,
    p_customer_first_name,
    p_customer_last_name,
    p_customer_phone,
    p_customer_email
  ) created;

  loop
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr(v_alphabet, (get_byte(gen_random_bytes(1), 0) % 32) + 1, 1);
    end loop;

    exit when not exists (
      select 1
      from public.appointments existing
      where regexp_replace(existing.customer_phone, '[^0-9]', '', 'g') = regexp_replace(p_customer_phone, '[^0-9]', '', 'g')
        and existing.cancellation_code_hash = encode(digest(v_code, 'sha256'), 'hex')
        and existing.status in ('pending', 'confirmed')
    );
  end loop;

  update public.appointments
  set cancellation_code_hash = encode(digest(v_code, 'sha256'), 'hex')
  where id = v_id;

  return query select v_id, v_token, v_code;
end;
$$;

revoke all on function public.create_public_appointment_v3(uuid, uuid, timestamptz, text, text, text, text) from public;
grant execute on function public.create_public_appointment_v3(uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

create or replace function public.cancel_public_appointment_by_reference(
  p_reference text,
  p_phone text
)
returns table (appointment_id uuid, google_calendar_id text, google_event_id text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_reference text;
  v_phone text;
begin
  v_reference := upper(regexp_replace(coalesce(p_reference, ''), '[^A-Za-z0-9]', '', 'g'));
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  if length(v_reference) <> 4 or length(v_phone) < 10 then
    return;
  end if;

  return query
  update public.appointments a
  set status = 'cancelled', updated_at = now()
  where a.id = (
    select candidate.id
    from public.appointments candidate
    where candidate.cancellation_code_hash = encode(digest(v_reference, 'sha256'), 'hex')
      and regexp_replace(candidate.customer_phone, '[^0-9]', '', 'g') = v_phone
      and candidate.status in ('pending', 'confirmed')
      and candidate.start_at > now()
    order by candidate.start_at
    limit 1
  )
  returning a.id, a.google_calendar_id, a.google_event_id;
end;
$$;

revoke all on function public.cancel_public_appointment_by_reference(text, text) from public;
grant execute on function public.cancel_public_appointment_by_reference(text, text) to anon, authenticated;
