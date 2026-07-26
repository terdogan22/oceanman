import { NextResponse } from "next/server";
import { authenticateAdmin, requireSuperadmin } from "@/lib/admin-auth";
import { sendAdminInvitationEmail } from "@/lib/admin-email";
import { getAdminSupabase } from "@/lib/supabase-admin";

type CreateUserInput = {
  email?: string;
  password?: string;
  displayName?: string;
};

type UpdateUserInput = {
  userId?: string;
  password?: string;
  displayName?: string;
  active?: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function superadminRequest(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.admin) return { response: NextResponse.json({ error: auth.error }, { status: auth.status }) };
  if (!requireSuperadmin(auth.admin)) {
    return { response: NextResponse.json({ error: "Bu işlem yalnızca superadmin içindir." }, { status: 403 }) };
  }
  return { admin: auth.admin };
}

export async function GET(request: Request) {
  const access = await superadminRequest(request);
  if (access.response) return access.response;

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  const [{ data: authData, error: authError }, { data: rows, error: rowsError }] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from("admin_users").select("user_id, display_name, role, active, must_change_password, created_at").order("created_at"),
  ]);

  if (authError || rowsError) return NextResponse.json({ error: "Kullanıcılar alınamadı." }, { status: 500 });

  const authUsers = new Map(authData.users.map((user) => [user.id, user]));
  const users = (rows ?? []).map((row) => ({
    userId: row.user_id,
    email: authUsers.get(row.user_id)?.email ?? "",
    displayName: row.display_name,
    role: row.role,
    active: row.active,
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: row.created_at,
  }));

  if (access.admin && !users.some((user) => user.userId === access.admin?.userId)) {
    users.unshift({
      userId: access.admin.userId,
      email: access.admin.email,
      displayName: access.admin.displayName,
      role: "superadmin",
      active: true,
      mustChangePassword: false,
      createdAt: "",
    });
  }

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const access = await superadminRequest(request);
  if (access.response) return access.response;

  const input = (await request.json().catch(() => ({}))) as CreateUserInput;
  const email = input.email?.trim().toLocaleLowerCase("tr") ?? "";
  const password = input.password ?? "";
  const displayName = input.displayName?.trim() ?? "";
  if (!emailPattern.test(email) || password.length < 8 || displayName.length < 2) {
    return NextResponse.json({ error: "Ad, geçerli e-posta ve en az 8 karakter şifre gereklidir." }, { status: 422 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: "Kullanıcı oluşturulamadı. E-posta daha önce kullanılmış olabilir." }, { status: 409 });
  }

  const { error: roleError } = await supabase.from("admin_users").insert({
    user_id: created.user.id,
    display_name: displayName,
    role: "manager",
    active: true,
    must_change_password: true,
    created_by: access.admin?.userId,
  });

  if (roleError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Kullanıcı yetkisi kaydedilemedi." }, { status: 500 });
  }

  const delivery = await sendAdminInvitationEmail({
    to: email,
    displayName,
    temporaryPassword: password,
  });

  return NextResponse.json({
    ok: true,
    userId: created.user.id,
    emailSent: delivery.sent,
    message: delivery.sent
      ? "Kullanıcı oluşturuldu ve giriş bilgileri e-postayla gönderildi."
      : `Kullanıcı oluşturuldu ancak e-posta gönderilemedi: ${delivery.reason}`,
  });
}

export async function PATCH(request: Request) {
  const access = await superadminRequest(request);
  if (access.response) return access.response;

  const input = (await request.json().catch(() => ({}))) as UpdateUserInput;
  const displayName = input.displayName?.trim() ?? "";
  const password = input.password ?? "";
  if (
    !input.userId || !uuidPattern.test(input.userId) || displayName.length < 2 ||
    typeof input.active !== "boolean" || (password && password.length < 8)
  ) {
    return NextResponse.json({ error: "Kullanıcı bilgileri geçersiz." }, { status: 422 });
  }
  if (input.userId === access.admin?.userId && !input.active) {
    return NextResponse.json({ error: "Kendi superadmin hesabınızı pasif yapamazsınız." }, { status: 422 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Yönetim servisi yapılandırılmamış." }, { status: 503 });

  if (password) {
    const { error } = await supabase.auth.admin.updateUserById(input.userId, {
      password,
      user_metadata: { display_name: displayName },
    });
    if (error) return NextResponse.json({ error: "Kullanıcı şifresi güncellenemedi." }, { status: 500 });
  } else {
    const { error } = await supabase.auth.admin.updateUserById(input.userId, {
      user_metadata: { display_name: displayName },
    });
    if (error) return NextResponse.json({ error: "Kullanıcı bilgileri güncellenemedi." }, { status: 500 });
  }

  const { error } = await supabase
    .from("admin_users")
    .update({ display_name: displayName, active: input.active })
    .eq("user_id", input.userId);
  if (error) return NextResponse.json({ error: "Kullanıcı yetkisi güncellenemedi." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
