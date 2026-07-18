import { createGoogleEvent, GoogleCalendarError, googleCalendarConfigured, listGoogleEvents } from "@/lib/google-calendar";
import { getAdminSupabase } from "@/lib/supabase-admin";

type SyncState = {
  staff_id: string;
  calendar_id: string;
  sync_token: string | null;
  enabled: boolean;
};

function eventRange(event: { start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }) {
  if (event.start?.dateTime && event.end?.dateTime) {
    return { startAt: new Date(event.start.dateTime).toISOString(), endAt: new Date(event.end.dateTime).toISOString() };
  }
  if (event.start?.date && event.end?.date) {
    return {
      startAt: new Date(`${event.start.date}T00:00:00+03:00`).toISOString(),
      endAt: new Date(`${event.end.date}T00:00:00+03:00`).toISOString(),
    };
  }
  return null;
}

async function removeGoogleBlock(staffId: string, eventId: string) {
  const supabase = getAdminSupabase();
  if (!supabase) return;
  await supabase.from("calendar_blocks").delete().eq("staff_id", staffId).eq("external_event_id", eventId);
}

async function storeGoogleBlock(staffId: string, event: Parameters<typeof eventRange>[0] & { id: string; summary?: string }) {
  const supabase = getAdminSupabase();
  const range = eventRange(event);
  if (!supabase || !range) return;

  const values = {
    staff_id: staffId,
    start_at: range.startAt,
    end_at: range.endAt,
    source: "google",
    external_event_id: event.id,
    summary: event.summary?.slice(0, 250) || "Google Takvim etkinliği",
  };
  const { data: existing } = await supabase
    .from("calendar_blocks")
    .select("id")
    .eq("staff_id", staffId)
    .eq("external_event_id", event.id)
    .maybeSingle();

  if (existing?.id) await supabase.from("calendar_blocks").update(values).eq("id", existing.id);
  else await supabase.from("calendar_blocks").insert(values);
}

async function runStateSync(state: SyncState, forceFull = false) {
  const supabase = getAdminSupabase();
  if (!supabase) throw new Error("Supabase service role yapılandırılmadı.");

  const { items, nextSyncToken } = await listGoogleEvents(state.calendar_id, forceFull ? null : state.sync_token);
  for (const event of items) {
    const oceanmanAppointmentId = event.extendedProperties?.private?.oceanmanAppointmentId;
    const createdByOceanman = Boolean(oceanmanAppointmentId);
    if (createdByOceanman && event.status === "cancelled" && oceanmanAppointmentId) {
      await supabase.from("appointments").update({ status: "cancelled" }).eq("id", oceanmanAppointmentId);
    }
    if (event.status === "cancelled" || event.transparency === "transparent" || createdByOceanman || !eventRange(event)) {
      await removeGoogleBlock(state.staff_id, event.id);
    } else {
      await storeGoogleBlock(state.staff_id, event);
    }
  }

  await supabase.from("calendar_sync_states").update({
    sync_token: nextSyncToken ?? state.sync_token,
    last_synced_at: new Date().toISOString(),
    last_error: null,
  }).eq("staff_id", state.staff_id);

  return items.length;
}

export async function syncStaffCalendar(staffId: string) {
  const supabase = getAdminSupabase();
  if (!supabase || !googleCalendarConfigured()) return { synced: false, changed: 0 };

  const { data: state, error } = await supabase
    .from("calendar_sync_states")
    .select("staff_id,calendar_id,sync_token,enabled")
    .eq("staff_id", staffId)
    .eq("enabled", true)
    .maybeSingle();
  if (error || !state) return { synced: false, changed: 0 };

  try {
    const changed = await runStateSync(state as SyncState);
    return { synced: true, changed };
  } catch (caught) {
    if (caught instanceof GoogleCalendarError && caught.status === 410) {
      await supabase.from("calendar_blocks").delete().eq("staff_id", staffId).eq("source", "google");
      await supabase.from("calendar_sync_states").update({ sync_token: null }).eq("staff_id", staffId);
      const changed = await runStateSync({ ...(state as SyncState), sync_token: null }, true);
      return { synced: true, changed };
    }

    const message = caught instanceof Error ? caught.message.slice(0, 1000) : "Takvim senkronizasyonu başarısız.";
    await supabase.from("calendar_sync_states").update({ last_error: message }).eq("staff_id", staffId);
    throw caught;
  }
}

export async function syncAppointmentToGoogle(appointmentId: string) {
  const supabase = getAdminSupabase();
  if (!supabase || !googleCalendarConfigured()) return false;

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id,service_id,staff_id,customer_first_name,customer_last_name,customer_phone,customer_email,start_at,end_at")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appointment) return false;

  const [{ data: service }, { data: staff }, { data: state }] = await Promise.all([
    supabase.from("services").select("name").eq("id", appointment.service_id).maybeSingle(),
    supabase.from("staff").select("name").eq("id", appointment.staff_id).maybeSingle(),
    supabase.from("calendar_sync_states").select("calendar_id,enabled").eq("staff_id", appointment.staff_id).maybeSingle(),
  ]);
  if (!state?.enabled || !state.calendar_id) return false;

  try {
    const event = await createGoogleEvent(state.calendar_id, {
      summary: `Oceanman • ${service?.name ?? "Randevu"} • ${appointment.customer_first_name} ${appointment.customer_last_name}`,
      description: [
        `Personel: ${staff?.name ?? ""}`,
        `Telefon: ${appointment.customer_phone}`,
        `E-posta: ${appointment.customer_email}`,
        `Oceanman randevu no: ${appointment.id}`,
      ].join("\n"),
      start: { dateTime: appointment.start_at, timeZone: "Europe/Istanbul" },
      end: { dateTime: appointment.end_at, timeZone: "Europe/Istanbul" },
      extendedProperties: { private: { oceanmanAppointmentId: appointment.id } },
    });
    await supabase.from("appointments").update({
      google_calendar_id: state.calendar_id,
      google_event_id: event.id,
      google_sync_status: "synced",
      google_sync_error: null,
    }).eq("id", appointment.id);
    return true;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message.slice(0, 1000) : "Google etkinliği oluşturulamadı.";
    await supabase.from("appointments").update({ google_sync_status: "error", google_sync_error: message }).eq("id", appointment.id);
    return false;
  }
}

export async function syncAllCalendars() {
  const supabase = getAdminSupabase();
  if (!supabase) return { calendars: 0, events: 0, appointments: 0 };

  const { data: states } = await supabase.from("calendar_sync_states").select("staff_id").eq("enabled", true);
  let events = 0;
  for (const state of states ?? []) {
    try {
      const result = await syncStaffCalendar(state.staff_id);
      events += result.changed;
    } catch {
      // One employee's calendar must not stop the others from syncing.
    }
  }

  const { data: pending } = await supabase
    .from("appointments")
    .select("id")
    .eq("status", "confirmed")
    .in("google_sync_status", ["pending", "error"])
    .order("created_at", { ascending: true })
    .limit(25);
  let appointments = 0;
  for (const appointment of pending ?? []) {
    if (await syncAppointmentToGoogle(appointment.id)) appointments += 1;
  }

  return { calendars: states?.length ?? 0, events, appointments };
}
