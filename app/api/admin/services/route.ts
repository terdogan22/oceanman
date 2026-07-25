import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { getAdminSupabase } from "@/lib/supabase-admin";

type ServiceUpdate = {
  id?: string;
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  active?: boolean;
  sortOrder?: number;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  const { data, error } = await supabase
    .from("services")
    .select("id, category, name, description, duration_minutes, price_cents, active, sort_order")
    .order("sort_order");

  if (error) return NextResponse.json({ error: "Hizmetler alınamadı." }, { status: 500 });

  return NextResponse.json({
    admin: auth.admin,
    services: (data ?? []).map((row) => ({
      id: row.id,
      category: row.category,
      name: row.name,
      description: row.description,
      duration: row.duration_minutes,
      price: row.price_cents / 100,
      active: row.active,
      sortOrder: row.sort_order,
    })),
  });
}

export async function PATCH(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const input = (await request.json().catch(() => ({}))) as ServiceUpdate;
  const name = input.name?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const duration = Number(input.duration);
  const price = Number(input.price);
  const sortOrder = Number(input.sortOrder);

  if (
    !input.id || !uuidPattern.test(input.id) || name.length < 2 ||
    !Number.isFinite(duration) || duration < 5 || duration > 480 ||
    !Number.isFinite(price) || price < 0 || price > 1_000_000 ||
    !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100_000 ||
    typeof input.active !== "boolean"
  ) {
    return NextResponse.json({ error: "Hizmet bilgileri geçersiz." }, { status: 422 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  const { data, error } = await supabase
    .from("services")
    .update({
      name,
      description,
      duration_minutes: Math.round(duration),
      price_cents: Math.round(price * 100),
      active: input.active,
      sort_order: sortOrder,
    })
    .eq("id", input.id)
    .select("id")
    .single();

  if (error || !data) return NextResponse.json({ error: "Hizmet kaydedilemedi." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
