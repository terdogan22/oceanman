import { NextResponse } from "next/server";
import { authenticateAdmin, requireSuperadmin } from "@/lib/admin-auth";
import { sendEmailExamples } from "@/lib/email-examples";

export async function POST(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!requireSuperadmin(auth.admin)) {
    return NextResponse.json({ error: "Bu işlem yalnızca superadmin içindir." }, { status: 403 });
  }

  try {
    const sent = await sendEmailExamples(auth.admin.email);
    if (!sent) return NextResponse.json({ error: "E-posta sunucusu örneklerin tamamını kabul etmedi." }, { status: 502 });
    return NextResponse.json({
      ok: true,
      message: `4 örnek e-posta ${auth.admin.email} adresine gönderildi.`,
    });
  } catch {
    return NextResponse.json({
      error: "Örnekler gönderilemedi. Önce SMTP ayarlarını kaydedip test edin.",
    }, { status: 502 });
  }
}
