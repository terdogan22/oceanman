import { NextResponse } from "next/server";
import { syncAppointmentToGoogle } from "@/lib/calendar-sync";
import { getPublicSupabase } from "@/lib/supabase-server";

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

  const supabase = getPublicSupabase();
  if (!supabase) {
    return NextResponse.json({
      appointmentId: `demo-${crypto.randomUUID()}`,
      cancellationUrl: "/randevu/iptal?token=demo",
      cancellationCode: "DEMO",
      demo: true,
      message: "Örnek randevunuz oluşturuldu. İptal bağlantınızı saklayın.",
    });
  }

  const { data, error } = await supabase.rpc("create_public_appointment_v3", {
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

  const created = Array.isArray(data) ? data[0] : data;
  const appointmentId = String(created?.appointment_id ?? "");
  const cancellationToken = String(created?.cancellation_token ?? "");
  const cancellationCode = String(created?.cancellation_code ?? "");
  if (!appointmentId || !cancellationToken || !cancellationCode) {
    return NextResponse.json({ error: "Randevu kaydı doğrulanamadı." }, { status: 500 });
  }
  await syncAppointmentToGoogle(appointmentId);

  return NextResponse.json({
    appointmentId,
    cancellationUrl: `/randevu/iptal?token=${encodeURIComponent(cancellationToken)}`,
    cancellationCode,
    message: "Randevunuz kaydedildi. İptal bağlantınızı saklayın.",
  });
}
