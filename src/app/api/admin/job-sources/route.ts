import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { scheduleJobSync } from "@/lib/queue/bid-queue";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("job_sources")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { sourceId, action } = body;

  if (action === "sync" || action === "sync-all") {
    try {
      const synced = await scheduleJobSync(action === "sync-all" ? undefined : sourceId);
      const supabase = createServiceClient();
      const now = new Date().toISOString();

      if (action === "sync-all") {
        await supabase
          .from("job_sources")
          .update({ last_sync_at: now, last_error: null })
          .eq("status", "active");
      } else if (sourceId) {
        await supabase
          .from("job_sources")
          .update({ last_sync_at: now, last_error: null })
          .eq("id", sourceId);
      }

      await supabase.from("audit_logs").insert({
        admin_id: admin.id,
        action: action === "sync-all" ? "sync_all_job_sources" : "sync_job_source",
        entity_type: "job_source",
        entity_id: sourceId || null,
        new_values: { synced },
      });

      return NextResponse.json({ success: true, synced });
    } catch (error) {
      const supabase = createServiceClient();
      if (sourceId) {
        await supabase
          .from("job_sources")
          .update({ last_error: (error as Error).message, status: "error" })
          .eq("id", sourceId);
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { sourceId, status } = await request.json();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("job_sources")
    .update({ status })
    .eq("id", sourceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    admin_id: admin.id,
    action: "update_job_source",
    entity_type: "job_source",
    entity_id: sourceId,
    new_values: { status },
  });

  return NextResponse.json({ success: true });
}
