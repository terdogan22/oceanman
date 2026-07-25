import { NextResponse } from "next/server";
import {
  services as fallbackServices,
  staff as fallbackStaff,
  type Category,
  type Service,
  type Staff,
} from "@/lib/booking-data";
import { getPublicSupabase } from "@/lib/supabase-server";

type ServiceRow = {
  id: string;
  category: Category;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
};

type StaffRow = {
  id: string;
  name: string;
  title: string;
  initials: string;
};

type StaffServiceRow = {
  staff_id: string;
  service_id: string;
};

export async function GET() {
  const supabase = getPublicSupabase();
  if (!supabase) {
    return NextResponse.json({ services: fallbackServices, staff: fallbackStaff, demo: true });
  }

  const [servicesResult, staffResult, mappingResult] = await Promise.all([
    supabase
      .from("services")
      .select("id, category, name, description, duration_minutes, price_cents")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("staff")
      .select("id, name, title, initials")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("staff_services").select("staff_id, service_id"),
  ]);

  if (servicesResult.error || staffResult.error || mappingResult.error) {
    return NextResponse.json({ error: "Hizmet bilgileri alınamadı." }, { status: 500 });
  }

  const services: Service[] = ((servicesResult.data ?? []) as ServiceRow[]).map((row) => ({
    id: row.id,
    category: row.category,
    title: row.name,
    description: row.description,
    duration: row.duration_minutes,
    price: row.price_cents / 100,
  }));

  const mapping = (mappingResult.data ?? []) as StaffServiceRow[];
  const staff: Staff[] = ((staffResult.data ?? []) as StaffRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    initials: row.initials,
    services: mapping.filter((item) => item.staff_id === row.id).map((item) => item.service_id),
  }));

  return NextResponse.json({ services, staff });
}
