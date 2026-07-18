import { NextRequest, NextResponse } from "next/server";
import { syncStaffCalendar } from "@/lib/calendar-sync";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceId = request.headers.get("x-goog-resource-id");
  const channelToken = request.headers.get("x-goog-channel-token");
  const expectedToken = process.env.GOOGLE_WEBHOOK_SECRET;
  const supabase = getAdminSupabase();

  if (!expectedToken || channelToken !== expectedToken || !channelId || !resourceId || !supabase) {
    return NextResponse.json({ error: "Geçersiz bildirim." }, { status: 401 });
  }

  const { data: state } = await supabase
    .from("calendar_sync_states")
    .select("staff_id")
    .eq("channel_id", channelId)
    .eq("resource_id", resourceId)
    .eq("enabled", true)
    .maybeSingle();
  if (!state) return new NextResponse(null, { status: 204 });

  try {
    await syncStaffCalendar(state.staff_id);
  } catch {
    // Google retries 5xx responses; periodic reconciliation is an additional fallback.
    return NextResponse.json({ error: "Senkronizasyon daha sonra yeniden denenecek." }, { status: 503 });
  }

  return new NextResponse(null, { status: 204 });
}
