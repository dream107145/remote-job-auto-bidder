import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnalytics } from "@/actions/bids";
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

  try {
    const data = await getAnalytics();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
