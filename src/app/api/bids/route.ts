import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { bidFilterSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filters = bidFilterSchema.parse({
    ...params,
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 50,
    sortBy: params.sortBy || "created_at",
    sortOrder: params.sortOrder || "desc",
    bidType: params.bidType || "all",
  });

  let query = supabase
    .from("bids")
    .select("*, profile:profiles(name)", { count: "exact" })
    .eq("user_id", user.id);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.bidType === "manual") {
    query = query.contains("application_data", { manual_bid: true });
  } else if (filters.bidType === "auto") {
    query = query.contains("application_data", { auto_generated: true });
  }
  if (filters.profileId) {
    query = query.eq("profile_id", filters.profileId);
  }
  if (filters.search) {
    query = query.or(
      `job_title.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
    );
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, error, count } = await query
    .order(filters.sortBy, { ascending: filters.sortOrder === "asc" })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.ceil((count ?? 0) / filters.pageSize),
  });
}
