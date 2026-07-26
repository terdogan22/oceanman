import { NextResponse } from "next/server";
import { authenticateAdmin, requireSuperadmin } from "@/lib/admin-auth";
import { encryptSecret } from "@/lib/secret-crypto";
import type { SmtpSecurity } from "@/lib/smtp-mail";
import { getAdminSupabase } from "@/lib/supabase-admin";

type EmailSettingsInput = {
  fromName?: string;
  fromEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: SmtpSecurity;
  smtpUsername?: string;
  smtpPassword?: string;
};

const validSecurities = new Set<SmtpSecurity>(["starttls", "tls", "none"]);

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!requireSuperadmin(auth.admin)) return NextResponse.json({ error: "Bu işlem yalnızca superadmin içindir." }, { status: 403 });

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  const { data, error } = await supabase
    .from("email_settings")
    .select("provider, from_name, from_email, smtp_host, smtp_port, smtp_security, smtp_username, smtp_password_encrypted")
    .eq("singleton", true)
    .single();

  if (error) return NextResponse.json({ error: "E-posta ayarları alınamadı." }, { status: 500 });

  return NextResponse.json({
    settings: {
      provider: "smtp",
      fromName: data.from_name,
      fromEmail: data.from_email,
      smtpHost: data.smtp_host,
      smtpPort: data.smtp_port,
      smtpSecurity: data.smtp_security,
      smtpUsername: data.smtp_username,
      smtpPasswordConfigured: Boolean(data.smtp_password_encrypted),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!requireSuperadmin(auth.admin)) return NextResponse.json({ error: "Bu işlem yalnızca superadmin içindir." }, { status: 403 });

  const input = (await request.json().catch(() => ({}))) as EmailSettingsInput;
  const fromName = input.fromName?.trim() ?? "";
  const fromEmail = input.fromEmail?.trim().toLocaleLowerCase("tr") ?? "";
  const smtpHost = input.smtpHost?.trim().toLocaleLowerCase("tr") ?? "";
  const smtpPort = Number(input.smtpPort);
  const smtpSecurity = input.smtpSecurity ?? "starttls";
  const smtpUsername = input.smtpUsername?.trim() ?? "";
  const smtpPassword = input.smtpPassword ?? "";

  if (
    fromName.length < 2 || !validEmail(fromEmail) ||
    smtpHost.length < 3 || smtpHost.length > 253 ||
    !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535 ||
    !validSecurities.has(smtpSecurity) || smtpUsername.length < 1
  ) {
    return NextResponse.json({ error: "SMTP ayarları geçersiz." }, { status: 422 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  const { data: current, error: currentError } = await supabase
    .from("email_settings")
    .select("smtp_password_encrypted")
    .eq("singleton", true)
    .single();

  if (currentError || (!smtpPassword && !current?.smtp_password_encrypted)) {
    return NextResponse.json({ error: "SMTP şifresi gereklidir." }, { status: 422 });
  }

  const update: Record<string, string | number> = {
    provider: "smtp",
    from_name: fromName,
    from_email: fromEmail,
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_security: smtpSecurity,
    smtp_username: smtpUsername,
    updated_by: auth.admin.userId,
  };

  try {
    if (smtpPassword) update.smtp_password_encrypted = encryptSecret(smtpPassword);
  } catch {
    return NextResponse.json({ error: "Sunucu şifreleme anahtarı yapılandırılmamış." }, { status: 503 });
  }

  const { data: saved, error } = await supabase
    .from("email_settings")
    .update(update)
    .eq("singleton", true)
    .select("smtp_password_encrypted")
    .single();

  if (error || !saved) return NextResponse.json({ error: "SMTP ayarları kaydedilemedi." }, { status: 500 });

  return NextResponse.json({ ok: true, smtpPasswordConfigured: Boolean(saved.smtp_password_encrypted) });
}
