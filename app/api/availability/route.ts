import { NextRequest, NextResponse } from "next/server";
import { services } from "@/lib/booking-data";
import { getPublicSupabase } from "@/lib/supabase-server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function istanbulDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function demoSlots(serviceId: string, date: string) {
  const service = services.find((item) => item.id === serviceId);
  if (!service) return [];

  const slots: string[] = [];
  const nowWithNotice = Date.now() + 30 * 60 * 1000;
  const closingMinutes = 20 * 60;

  for (let minutes = 9 * 60; minutes + service.duration <= closingMinutes; minutes += 30) {
    const hour = Math.floor(minutes / 60).toString().padStart(2, "0");
    const minute = (minutes % 60).toString().padStart(2, "0");
    const label = `${hour}:${minute}`;
    const start = new Date(`${date}T${label}:00+03:00`).getTime();

    if (start >= nowWithNotice) slots.push(label);
  }

  return slots;
}

export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get("serviceId") ?? "";
  const staffId = request.nextUrl.searchParams.get("staffId") ?? "";
  const date = request.nextUrl.searchParams.get("date") ?? "";

  if (!uuidPattern.test(serviceId) || !uuidPattern.test(staffId) || !datePattern.test(date)) {
    return NextResponse.json({ error: "Geçersiz hizmet, personel veya tarih." }, { status: 400 });
  }

  const requestedDay = new Date(`${date}T12:00:00+03:00`);
  const today = istanbulDate();
  const latestDay = new Date(`${today}T12:00:00+03:00`);
  latestDay.setDate(latestDay.getDate() + 60);

  if (Number.isNaN(requestedDay.getTime()) || date < today || requestedDay > latestDay) {
    return NextResponse.json({ error: "Bu tarih için randevu alınamıyor." }, { status: 422 });
  }

  const supabase = getPublicSupabase();
  if (!supabase) {
    return NextResponse.json({ date, slots: demoSlots(serviceId, date), demo: true });
  }

  const { data, error } = await supabase.rpc("get_public_availability", {
    p_service_id: serviceId,
    p_staff_id: staffId,
    p_date: date,
  });

  if (error) {
    return NextResponse.json({ error: "Uygun saatler alınamadı." }, { status: 500 });
  }

  const slots = (data ?? []).map((row: { start_at: string }) =>
    new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(row.start_at)),
  );

  return NextResponse.json({ date, slots });
}
