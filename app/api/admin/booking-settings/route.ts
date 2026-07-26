import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { defaultBookingSettings } from "@/lib/booking-settings";
import { getAdminSupabase } from "@/lib/supabase-admin";

type BookingSettingsUpdate = {
  bookingEnabled?: boolean;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  const { data, error } = await supabase
    .from("business_settings")
    .select("booking_enabled, booking_phone_display, booking_phone_href")
    .eq("singleton", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Randevu ayarı alınamadı." }, { status: 500 });
  }

  return NextResponse.json({
    settings: {
      bookingEnabled: Boolean(data.booking_enabled),
      phoneDisplay: String(data.booking_phone_display || defaultBookingSettings.phoneDisplay),
      phoneHref: String(data.booking_phone_href || defaultBookingSettings.phoneHref),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const input = (await request.json().catch(() => ({}))) as BookingSettingsUpdate;
  if (typeof input.bookingEnabled !== "boolean") {
    return NextResponse.json({ error: "Randevu durumu geçersiz." }, { status: 422 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  const { data, error } = await supabase
    .from("business_settings")
    .update({
      booking_enabled: input.bookingEnabled,
      updated_by: auth.admin.userId,
    })
    .eq("singleton", true)
    .select("booking_enabled, booking_phone_display, booking_phone_href")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Randevu durumu kaydedilemedi." }, { status: 500 });
  }

  return NextResponse.json({
    settings: {
      bookingEnabled: Boolean(data.booking_enabled),
      phoneDisplay: String(data.booking_phone_display || defaultBookingSettings.phoneDisplay),
      phoneHref: String(data.booking_phone_href || defaultBookingSettings.phoneHref),
    },
  });
}
