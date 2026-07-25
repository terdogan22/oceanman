import { NextResponse } from "next/server";
import { authenticateAdmin, requireSuperadmin } from "@/lib/admin-auth";
import { encryptSecret } from "@/lib/secret-crypto";
import { getAdminSupabase } from "@/lib/supabase-admin";

type EmailSettingsInput = {
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  notificationEmail?: string;
  apiKey?: string;
  clearApiKey?: boolean;
};

function validEmail(value: string, optional = false) {
  if (optional && !value) return true;
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
    .select("provider, from_name, from_email, reply_to, notification_email, api_key_encrypted")
    .eq("singleton", true)
    .single();

  if (error) return NextResponse.json({ error: "E-posta ayarları alınamadı." }, { status: 500 });

  return NextResponse.json({
    settings: {
      provider: data.provider,
      fromName: data.from_name,
      fromEmail: data.from_email,
      replyTo: data.reply_to,
      notificationEmail: data.notification_email,
      apiKeyConfigured: Boolean(data.api_key_encrypted),
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
  const replyTo = input.replyTo?.trim().toLocaleLowerCase("tr") ?? "";
  const notificationEmail = input.notificationEmail?.trim().toLocaleLowerCase("tr") ?? "";
  const apiKey = input.apiKey?.trim() ?? "";

  if (
    fromName.length < 2 || !validEmail(fromEmail) ||
    !validEmail(replyTo, true) || !validEmail(notificationEmail, true) ||
    (apiKey && !apiKey.startsWith("re_"))
  ) {
    return NextResponse.json({ error: "E-posta ayarları geçersiz." }, { status: 422 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  const update: Record<string, string | boolean | null> = {
    provider: "resend",
    from_name: fromName,
    from_email: fromEmail,
    reply_to: replyTo,
    notification_email: notificationEmail,
    updated_by: auth.admin.userId,
  };

  try {
    if (apiKey) update.api_key_encrypted = encryptSecret(apiKey);
    else if (input.clearApiKey) update.api_key_encrypted = null;
  } catch {
    return NextResponse.json({ error: "Sunucu şifreleme anahtarı yapılandırılmamış." }, { status: 503 });
  }

  const { data: saved, error } = await supabase
    .from("email_settings")
    .update(update)
    .eq("singleton", true)
    .select("api_key_encrypted")
    .single();
  if (error || !saved) return NextResponse.json({ error: "E-posta ayarları kaydedilemedi." }, { status: 500 });

  return NextResponse.json({ ok: true, apiKeyConfigured: Boolean(saved.api_key_encrypted) });
}
