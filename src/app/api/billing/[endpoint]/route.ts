import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { unwrapRelation } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const supabase = createClient();
  const path = request.nextUrl.pathname.split("/").pop();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  switch (path) {
    case "plans": {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_cents");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    case "subscription": {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plan:plans(*)")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    case "transactions": {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    case "usage": {
      const { data: userData } = await supabase
        .from("users")
        .select("bids_used, profiles_used")
        .eq("id", user.id)
        .single();

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan:plans(bid_limit, profile_limit)")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();

      const plan = unwrapRelation(sub?.plan);

      return NextResponse.json({
        success: true,
        data: {
          bidsUsed: userData?.bids_used ?? 0,
          bidsLimit: plan?.bid_limit ?? 50,
          profilesUsed: userData?.profiles_used ?? 0,
          profilesLimit: plan?.profile_limit ?? 1,
        },
      });
    }

    default:
      return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
