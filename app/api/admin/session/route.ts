import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = await authenticateAdmin(request, { allowPasswordChangeRequired: true });
  if (!auth.admin) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({ admin: auth.admin });
}
