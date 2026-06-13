import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";

async function verifyAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const search = params.get("search");
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(params.get("pageSize") || ADMIN_PAGE_SIZE))
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServiceClient();

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    data,
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
}

export async function PATCH(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, isBanned } = await request.json();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("users")
    .update({ is_banned: isBanned })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    admin_id: admin.id,
    user_id: userId,
    action: isBanned ? "ban_user" : "unban_user",
    entity_type: "user",
    entity_id: userId,
    new_values: { is_banned: isBanned },
  });

  return NextResponse.json({ success: true });
}
