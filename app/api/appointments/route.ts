import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type BookingInput = {
  serviceId?: string;
  staffId?: string;
  startAt?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  privacyAccepted?: boolean;
};

function isValid(input: BookingInput) {
  return Boolean(
    input.serviceId && input.staffId && input.startAt &&
    input.firstName?.trim() && input.lastName?.trim() &&
    input.phone && input.phone.replace(/\D/g, "").length >= 10 &&
    input.email?.includes("@") && input.privacyAccepted
  );
}

export async function POST(request: Request) {
  let input: BookingInput;
  try {
    input = (await request.json()) as BookingInput;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (!isValid(input)) {
    return NextResponse.json({ error: "Lütfen bütün alanları doğru şekilde doldurun." }, { status: 422 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey || supabaseUrl.includes("YOUR_PROJECT")) {
    return NextResponse.json({
      appointmentId: `demo-${crypto.randomUUID()}`,
      demo: true,
      message: "Örnek randevunuz oluşturuldu. Onay bilgileri telefonunuza gönderilecek.",
    });
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("create_public_appointment", {
    p_service_id: input.serviceId,
    p_staff_id: input.staffId,
    p_start_at: input.startAt,
    p_customer_first_name: input.firstName?.trim(),
    p_customer_last_name: input.lastName?.trim(),
    p_customer_phone: input.phone?.trim(),
    p_customer_email: input.email?.trim().toLowerCase(),
  });

  if (error) {
    const conflict = error.code === "23P01" || error.message.toLocaleLowerCase("tr").includes("müsait");
    return NextResponse.json(
      { error: conflict ? "Bu saat az önce doldu. Lütfen başka bir saat seçin." : "Randevu kaydedilemedi." },
      { status: conflict ? 409 : 500 },
    );
  }

  return NextResponse.json({
    appointmentId: String(data),
    message: "Randevunuz kaydedildi. Onay bilgileri telefonunuza gönderilecek.",
  });
}
