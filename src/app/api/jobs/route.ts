import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchJobs } from "@/actions/jobs";
import { rateLimit } from "@/lib/rate-limit";

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

  const params = request.nextUrl.searchParams;
  const skills = params.get("skills")?.split(",").filter(Boolean);

  try {
    const result = await searchJobs({
      search: params.get("search") || undefined,
      skills: skills?.length ? skills : undefined,
      minSalary: params.get("minSalary") ? Number(params.get("minSalary")) : undefined,
      maxSalary: params.get("maxSalary") ? Number(params.get("maxSalary")) : undefined,
      page: params.get("page") ? Number(params.get("page")) : 1,
      pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : 20,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
