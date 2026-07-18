import { NextRequest, NextResponse } from "next/server";
import { syncStaffCalendar } from "@/lib/calendar-sync";
import { watchGoogleCalendar } from "@/lib/google-calendar";
import { getAdminSupabase } from "@/lib/supabase-admin";

type ConnectInput = { staffId?: string; calendarId?: string };

function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "";
}

export async function POST(request: NextRequest) {
  const adminSecret = process.env.CALENDAR_ADMIN_SECRET;
  if (!adminSecret || request.headers.get("authorization") !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
  }

  const input = (await request.json().catch(() => ({}))) as ConnectInput;
  const webhookSecret = process.env.GOOGLE_WEBHOOK_SECRET;
  const baseUrl = siteUrl();
  const supabase = getAdminSupabase();
  if (!input.staffId || !input.calendarId || !webhookSecret || !baseUrl || !supabase) {
    return NextResponse.json({ error: "Takvim bağlantı ayarları eksik." }, { status: 422 });
  }

  const { data: staff } = await supabase.from("staff").select("id,name").eq("id", input.staffId).maybeSingle();
  if (!staff) return NextResponse.json({ error: "Personel bulunamadı." }, { status: 404 });

  await supabase.from("calendar_sync_states").upsert({
    staff_id: staff.id,
    calendar_id: input.calendarId.trim(),
    sync_token: null,
    enabled: true,
    last_error: null,
  });

  try {
    await syncStaffCalendar(staff.id);
    const channel = await watchGoogleCalendar(
      input.calendarId.trim(),
      `${baseUrl}/api/google-calendar/webhook`,
      webhookSecret,
    );
    await supabase.from("calendar_sync_states").update({
      channel_id: channel.id,
      resource_id: channel.resourceId,
      channel_expires_at: channel.expiration ? new Date(Number(channel.expiration)).toISOString() : null,
    }).eq("staff_id", staff.id);

    return NextResponse.json({ ok: true, staff: staff.name, calendarId: input.calendarId });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Google Takvim bağlantısı kurulamadı.";
    await supabase.from("calendar_sync_states").update({ last_error: message.slice(0, 1000) }).eq("staff_id", staff.id);
    return NextResponse.json({ error: "Google Takvim erişimi doğrulanamadı." }, { status: 502 });
  }
}
