create or replace function public.create_public_appointment_v2(
  p_service_id uuid,
  p_staff_id uuid,
  p_start_at timestamptz,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_phone text,
  p_customer_email text
)
returns table (appointment_id uuid, cancellation_token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_token text;
begin
  v_id := public.create_public_appointment(
    p_service_id,
    p_staff_id,
    p_start_at,
    p_customer_first_name,
    p_customer_last_name,
    p_customer_phone,
    p_customer_email
  );
  v_token := encode(gen_random_bytes(32), 'hex');

  update public.appointments
  set cancellation_token_hash = encode(digest(v_token, 'sha256'), 'hex')
  where id = v_id;

  return query select v_id, v_token;
end;
$$;

create or replace function public.cancel_public_appointment(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cancelled boolean;
begin
  if p_token is null or length(p_token) <> 64 then
    return false;
  end if;

  update public.appointments
  set status = 'cancelled', updated_at = now()
  where cancellation_token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and status in ('pending', 'confirmed')
    and start_at > now()
  returning true into v_cancelled;

  return coalesce(v_cancelled, false);
end;
$$;

revoke all on function public.create_public_appointment_v2(uuid, uuid, timestamptz, text, text, text, text) from public;
revoke all on function public.cancel_public_appointment(text) from public;
grant execute on function public.create_public_appointment_v2(uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

create or replace function public.cancel_public_appointment_v2(p_token text)
returns table (appointment_id uuid, google_calendar_id text, google_event_id text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_token is null or length(p_token) <> 64 then
    return;
  end if;

  return query
  update public.appointments a
  set status = 'cancelled', updated_at = now()
  where a.cancellation_token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and a.status in ('pending', 'confirmed')
    and a.start_at > now()
  returning a.id, a.google_calendar_id, a.google_event_id;
end;
$$;

revoke all on function public.cancel_public_appointment_v2(text) from public;
grant execute on function public.cancel_public_appointment_v2(text) to anon, authenticated;
