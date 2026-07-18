-- Google calendars can contain overlapping events. Availability only needs to
-- know whether any block intersects the requested service interval.
alter table public.calendar_blocks
  drop constraint if exists calendar_blocks_no_staff_overlap;

alter table public.calendar_sync_states
  add column if not exists enabled boolean not null default true,
  add column if not exists last_error text;

alter table public.appointments
  add column if not exists google_sync_status text not null default 'pending'
    check (google_sync_status in ('pending', 'synced', 'error', 'disabled')),
  add column if not exists google_sync_error text;

create index if not exists appointments_google_sync_pending_idx
  on public.appointments (google_sync_status, created_at)
  where status = 'confirmed' and google_sync_status in ('pending', 'error');
