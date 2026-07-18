import { NextResponse } from "next/server";
import { deleteGoogleEvent } from "@/lib/google-calendar";
import { getPublicSupabase } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as { token?: string };
  if (!input.token) return NextResponse.json({ error: "İptal bağlantısı geçersiz." }, { status: 400 });

  const supabase = getPublicSupabase();
  if (!supabase) {
    if (input.token === "demo") return NextResponse.json({ ok: true, demo: true });
    return NextResponse.json({ error: "Randevu sistemi henüz canlı veritabanına bağlı değil." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("cancel_public_appointment_v2", { p_token: input.token });
  if (error) return NextResponse.json({ error: "Randevu iptal edilemedi." }, { status: 500 });
  const cancelled = Array.isArray(data) ? data[0] : data;
  if (!cancelled?.appointment_id) return NextResponse.json({ error: "Randevu bulunamadı veya daha önce iptal edildi." }, { status: 404 });

  if (cancelled.google_calendar_id && cancelled.google_event_id) {
    await deleteGoogleEvent(cancelled.google_calendar_id, cancelled.google_event_id).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
