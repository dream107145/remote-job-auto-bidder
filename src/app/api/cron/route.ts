import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { processAutoBids, scheduleJobSync } from "@/lib/queue/bid-queue";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await request.json();

  switch (action) {
    case "sync-jobs": {
      const count = await scheduleJobSync();
      return NextResponse.json({ success: true, jobsSynced: count });
    }
    case "process-auto-bids": {
      const count = await processAutoBids();
      return NextResponse.json({ success: true, bidsQueued: count });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const supabase = createServiceClient();

  const { data: sources } = await supabase
    .from("job_sources")
    .select("*")
    .order("name");

  return NextResponse.json({ success: true, data: sources });
}
