-- Public availability is calculated in the database so appointments created
-- from the website and blocks imported from Google Calendar use one source of truth.

create or replace function public.get_public_availability(
  p_service_id uuid,
  p_staff_id uuid,
  p_date date
)
returns table (start_at timestamptz)
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
declare
  v_duration integer;
  v_open time;
  v_close time;
  v_day_start timestamptz;
  v_day_end timestamptz;
begin
  if p_date < (now() at time zone 'Europe/Istanbul')::date
     or p_date > (now() at time zone 'Europe/Istanbul')::date + 60 then
    return;
  end if;

  select s.duration_minutes into v_duration
  from public.services s
  join public.staff_services ss on ss.service_id = s.id
  join public.staff st on st.id = ss.staff_id
  where s.id = p_service_id
    and ss.staff_id = p_staff_id
    and s.active
    and st.active;

  if v_duration is null then
    return;
  end if;

  select bh.opens_at, bh.closes_at into v_open, v_close
  from public.business_hours bh
  where (bh.staff_id = p_staff_id or bh.staff_id is null)
    and bh.iso_weekday = extract(isodow from p_date)
    and bh.active
  order by bh.staff_id nulls last
  limit 1;

  if v_open is null then
    return;
  end if;

  v_day_start := (p_date::timestamp + v_open) at time zone 'Europe/Istanbul';
  v_day_end := (p_date::timestamp + v_close) at time zone 'Europe/Istanbul';

  return query
  select candidate
  from generate_series(
    v_day_start,
    v_day_end - make_interval(mins => v_duration),
    interval '30 minutes'
  ) as candidate
  where candidate >= now() + interval '30 minutes'
    and not exists (
      select 1
      from public.appointments a
      where a.staff_id = p_staff_id
        and a.status in ('pending', 'confirmed')
        and tstzrange(a.start_at, a.end_at, '[)')
          && tstzrange(candidate, candidate + make_interval(mins => v_duration), '[)')
    )
    and not exists (
      select 1
      from public.calendar_blocks cb
      where cb.staff_id = p_staff_id
        and tstzrange(cb.start_at, cb.end_at, '[)')
          && tstzrange(candidate, candidate + make_interval(mins => v_duration), '[)')
    )
  order by candidate;
end;
$$;

revoke all on function public.get_public_availability(uuid, uuid, date) from public;
grant execute on function public.get_public_availability(uuid, uuid, date) to anon, authenticated;
