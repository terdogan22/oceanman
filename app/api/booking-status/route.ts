import { NextResponse } from "next/server";
import { readBookingSettings } from "@/lib/booking-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await readBookingSettings();

  return NextResponse.json(
    {
      enabled: settings.bookingEnabled,
      phoneDisplay: settings.phoneDisplay,
      phoneHref: settings.phoneHref,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
