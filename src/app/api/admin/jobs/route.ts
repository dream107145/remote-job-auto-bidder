import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { scheduleJobSync } from "@/lib/queue/bid-queue";
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

  return profile?.role === "admin" ? user : null;
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const search = params.get("search") || undefined;
  const sourceId = params.get("sourceId") || undefined;
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize") || ADMIN_PAGE_SIZE)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServiceClient();

  let query = supabase
    .from("jobs")
    .select("*, source:job_sources(name, slug)", { count: "exact" })
    .order("posted_at", { ascending: false, nullsFirst: false });

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`
    );
  }
  if (sourceId) {
    query = query.eq("source_id", sourceId);
  }

  const [{ data, error, count }, { count: totalJobs }, { data: sources }] = await Promise.all([
    query.range(from, to),
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("job_sources").select("id, name, last_sync_at, status").order("name"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lastSyncAt =
    sources
      ?.map((s) => s.last_sync_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

  return NextResponse.json({
    success: true,
    data,
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
    stats: {
      totalJobs: totalJobs ?? 0,
      activeSources: sources?.filter((s) => s.status === "active").length ?? 0,
      lastSyncAt,
    },
    sources,
  });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { action, sourceId } = body;

  if (action !== "sync" && action !== "sync-all") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

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
      action: action === "sync-all" ? "sync_all_jobs" : "sync_jobs",
      entity_type: "job",
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

export async function DELETE(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { jobId, jobIds } = await request.json();
  const ids: string[] = jobIds?.length ? jobIds : jobId ? [jobId] : [];

  if (!ids.length) {
    return NextResponse.json({ error: "No job IDs provided" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("jobs").delete().in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    admin_id: admin.id,
    action: ids.length > 1 ? "bulk_delete_jobs" : "delete_job",
    entity_type: "job",
    entity_id: ids[0],
    new_values: { deletedCount: ids.length, jobIds: ids },
  });

  return NextResponse.json({ success: true, deleted: ids.length });
}

export async function PATCH(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { jobId, ...updates } = await request.json();
  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};
  if (updates.title != null) allowed.title = updates.title;
  if (updates.company != null) allowed.company = updates.company;
  if (updates.description != null) allowed.description = updates.description;
  if (updates.url != null) allowed.url = updates.url;
  if (updates.salary_min != null) allowed.salary_min = updates.salary_min;
  if (updates.salary_max != null) allowed.salary_max = updates.salary_max;
  if (updates.job_type != null) allowed.job_type = updates.job_type;
  if (updates.location != null) allowed.location = updates.location;
  if (updates.skills != null) allowed.skills = updates.skills;

  if (!Object.keys(allowed).length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("jobs")
    .update(allowed)
    .eq("id", jobId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    admin_id: admin.id,
    action: "update_job",
    entity_type: "job",
    entity_id: jobId,
    new_values: allowed,
  });

  return NextResponse.json({ success: true, data });
}
