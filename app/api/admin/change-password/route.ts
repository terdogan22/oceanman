import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { getAdminSupabase } from "@/lib/supabase-admin";

type ChangePasswordInput = {
  password?: string;
};

export async function POST(request: Request) {
  const auth = await authenticateAdmin(request, { allowPasswordChangeRequired: true });
  if (!auth.admin) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (auth.admin.role === "superadmin" || !auth.admin.mustChangePassword) {
    return NextResponse.json({ error: "Bu hesap için zorunlu şifre değişikliği bulunmuyor." }, { status: 409 });
  }

  const input = (await request.json().catch(() => ({}))) as ChangePasswordInput;
  const password = input.password ?? "";
  if (password.length < 10) {
    return NextResponse.json({ error: "Yeni şifre en az 10 karakter olmalıdır." }, { status: 422 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });
  }

  const { error: passwordError } = await supabase.auth.admin.updateUserById(auth.admin.userId, { password });
  if (passwordError) {
    return NextResponse.json({ error: "Yeni şifre kaydedilemedi." }, { status: 500 });
  }

  const { error: rowError } = await supabase
    .from("admin_users")
    .update({ must_change_password: false, password_changed_at: new Date().toISOString() })
    .eq("user_id", auth.admin.userId);
  if (rowError) {
    return NextResponse.json({ error: "Şifre değişikliği tamamlanamadı." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
