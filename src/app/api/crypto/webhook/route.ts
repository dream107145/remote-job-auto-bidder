import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const signature = request.headers.get("x-nowpayments-sig");

  if (signature && process.env.NOWPAYMENTS_IPN_SECRET) {
    const expectedSig = crypto
      .createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET)
      .update(JSON.stringify(body, Object.keys(body).sort()))
      .digest("hex");

    if (signature !== expectedSig) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  const { payment_status, order_id } = body;

  if (payment_status === "finished" && order_id) {
    const [userId, planId] = order_id.split("-");
    const supabase = createServiceClient();

    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      { onConflict: "user_id" }
    );

    await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("user_id", userId)
      .eq("status", "pending")
      .eq("type", "crypto");
  }

  return NextResponse.json({ received: true });
}
