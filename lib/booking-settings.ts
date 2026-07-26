import { getAdminSupabase } from "@/lib/supabase-admin";

export type BookingSettings = {
  bookingEnabled: boolean;
  phoneDisplay: string;
  phoneHref: string;
};

export const defaultBookingSettings: BookingSettings = {
  bookingEnabled: true,
  phoneDisplay: "0 540 236 00 66",
  phoneHref: "+905402360066",
};

export async function readBookingSettings(): Promise<BookingSettings> {
  const supabase = getAdminSupabase();
  if (!supabase) return defaultBookingSettings;

  const { data, error } = await supabase
    .from("business_settings")
    .select("booking_enabled, booking_phone_display, booking_phone_href")
    .eq("singleton", true)
    .maybeSingle();

  if (error || !data) return defaultBookingSettings;

  return {
    bookingEnabled: Boolean(data.booking_enabled),
    phoneDisplay: String(data.booking_phone_display || defaultBookingSettings.phoneDisplay),
    phoneHref: String(data.booking_phone_href || defaultBookingSettings.phoneHref),
  };
}
