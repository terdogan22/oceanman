import { NextResponse } from "next/server";
import { authenticateAdmin, requireSuperadmin } from "@/lib/admin-auth";
import { decryptSecret } from "@/lib/secret-crypto";
import { sendSmtpEmail, type SmtpSecurity, type SmtpSettings } from "@/lib/smtp-mail";
import { getAdminSupabase } from "@/lib/supabase-admin";

type TestInput = {
  fromName?: string;
  fromEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: SmtpSecurity;
  smtpUsername?: string;
  smtpPassword?: string;
};

const validSecurities = new Set<SmtpSecurity>(["starttls", "tls", "none"]);

export async function POST(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!requireSuperadmin(auth.admin)) return NextResponse.json({ error: "Bu işlem yalnızca superadmin içindir." }, { status: 403 });

  const input = (await request.json().catch(() => ({}))) as TestInput;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  let password = input.smtpPassword ?? "";
  if (!password) {
    const { data } = await supabase
      .from("email_settings")
      .select("smtp_password_encrypted")
      .eq("singleton", true)
      .single();
    if (data?.smtp_password_encrypted) {
      try {
        password = decryptSecret(data.smtp_password_encrypted);
      } catch {
        password = "";
      }
    }
  }

  const settings: SmtpSettings = {
    fromName: input.fromName?.trim() ?? "",
    fromEmail: input.fromEmail?.trim().toLocaleLowerCase("tr") ?? "",
    host: input.smtpHost?.trim().toLocaleLowerCase("tr") ?? "",
    port: Number(input.smtpPort),
    security: input.smtpSecurity ?? "starttls",
    username: input.smtpUsername?.trim() ?? "",
    password,
  };

  if (
    settings.fromName.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.fromEmail) ||
    settings.host.length < 3 ||
    !Number.isInteger(settings.port) || settings.port < 1 || settings.port > 65535 ||
    !validSecurities.has(settings.security) ||
    !settings.username || !settings.password
  ) {
    return NextResponse.json({ error: "Test için bütün SMTP alanlarını doldurun." }, { status: 422 });
  }

  try {
    const sent = await sendSmtpEmail(settings, {
      to: settings.fromEmail,
      subject: "Oceanman SMTP test e-postası",
      html: "<h2>Oceanman SMTP bağlantısı çalışıyor.</h2><p>Bu e-posta yönetim panelindeki test işlemiyle gönderildi.</p>",
      text: "Oceanman SMTP bağlantısı çalışıyor. Bu e-posta yönetim panelindeki test işlemiyle gönderildi.",
    });

    if (!sent) return NextResponse.json({ error: "SMTP sunucusu e-postayı kabul etmedi." }, { status: 502 });
    return NextResponse.json({ ok: true, message: `Test e-postası ${settings.fromEmail} adresine gönderildi.` });
  } catch {
    return NextResponse.json({ error: "SMTP bağlantısı kurulamadı. Sunucu, port, güvenlik ve giriş bilgilerini kontrol edin." }, { status: 502 });
  }
}
