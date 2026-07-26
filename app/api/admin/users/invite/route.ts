import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateAdmin, requireSuperadmin } from "@/lib/admin-auth";
import { sendAdminInvitationEmail } from "@/lib/admin-email";
import { loadStoredSmtpSettings } from "@/lib/smtp-mail";
import { getAdminSupabase } from "@/lib/supabase-admin";

type InviteInput = {
  userId?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";

function temporaryPassword(length = 14) {
  return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length)]).join("");
}

export async function POST(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!requireSuperadmin(auth.admin)) {
    return NextResponse.json({ error: "Bu işlem yalnızca superadmin içindir." }, { status: 403 });
  }

  const input = (await request.json().catch(() => ({}))) as InviteInput;
  if (!input.userId || !uuidPattern.test(input.userId) || input.userId === auth.admin.userId) {
    return NextResponse.json({ error: "Kullanıcı bilgisi geçersiz." }, { status: 422 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });
  }

  const [{ data: authUser, error: authUserError }, { data: adminUser, error: adminUserError }] = await Promise.all([
    supabase.auth.admin.getUserById(input.userId),
    supabase
      .from("admin_users")
      .select("display_name, role, active")
      .eq("user_id", input.userId)
      .maybeSingle(),
  ]);
  const email = authUser.user?.email ?? "";
  if (authUserError || adminUserError || !adminUser || adminUser.role === "superadmin" || !email) {
    return NextResponse.json({ error: "Yetkili kullanıcı bulunamadı." }, { status: 404 });
  }
  if (!adminUser.active) {
    return NextResponse.json({ error: "Davet göndermeden önce hesabı aktif yapın." }, { status: 422 });
  }

  const smtpSettings = await loadStoredSmtpSettings();
  if (!smtpSettings) {
    return NextResponse.json({
      error: "SMTP ayarları tamamlanmadan giriş bilgileri gönderilemez.",
    }, { status: 422 });
  }

  const password = temporaryPassword();
  const { error: passwordError } = await supabase.auth.admin.updateUserById(input.userId, { password });
  if (passwordError) {
    return NextResponse.json({ error: "Geçici şifre oluşturulamadı." }, { status: 500 });
  }

  const { error: flagError } = await supabase
    .from("admin_users")
    .update({ must_change_password: true, password_changed_at: null })
    .eq("user_id", input.userId);
  if (flagError) {
    return NextResponse.json({ error: "İlk giriş zorunluluğu kaydedilemedi." }, { status: 500 });
  }

  const delivery = await sendAdminInvitationEmail({
    to: email,
    displayName: String(adminUser.display_name || email),
    temporaryPassword: password,
  });
  if (!delivery.sent) {
    return NextResponse.json({
      error: `Geçici şifre yenilendi ancak e-posta gönderilemedi: ${delivery.reason}`,
    }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: "Yeni giriş bilgileri e-postayla gönderildi." });
}
