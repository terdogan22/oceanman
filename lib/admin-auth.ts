import { getAdminSupabase } from "@/lib/supabase-admin";

export type AdminIdentity = {
  userId: string;
  email: string;
  displayName: string;
  role: "superadmin" | "manager";
};

type AdminAuthResult =
  | { admin: AdminIdentity; error?: never; status?: never }
  | { admin?: never; error: string; status: number };

export async function authenticateAdmin(request: Request): Promise<AdminAuthResult> {
  const supabase = getAdminSupabase();
  if (!supabase) {
    return { error: "Yönetim servisi yapılandırılmamış.", status: 503 };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return { error: "Oturum açmanız gerekiyor.", status: 401 };

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userResult.user) {
    return { error: "Oturum geçersiz veya süresi dolmuş.", status: 401 };
  }

  const normalizedEmail = (userResult.user.email ?? "").trim().toLocaleLowerCase("tr");
  const superadminEmail = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLocaleLowerCase("tr");
  if (normalizedEmail && superadminEmail && normalizedEmail === superadminEmail) {
    return {
      admin: {
        userId: userResult.user.id,
        email: userResult.user.email ?? "",
        displayName: String(userResult.user.user_metadata?.display_name || userResult.user.email || "Superadmin"),
        role: "superadmin",
      },
    };
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("display_name, role, active")
    .eq("user_id", userResult.user.id)
    .eq("active", true)
    .maybeSingle();

  if (adminError || !adminRow) {
    return { error: "Bu hesabın yönetim yetkisi yok.", status: 403 };
  }

  return {
    admin: {
      userId: userResult.user.id,
      email: userResult.user.email ?? "",
      displayName: String(adminRow.display_name || userResult.user.email || "Yönetici"),
      role: adminRow.role === "superadmin" ? "superadmin" : "manager",
    },
  };
}

export function requireSuperadmin(admin: AdminIdentity) {
  return admin.role === "superadmin";
}
