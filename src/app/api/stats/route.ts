import { NextResponse } from "next/server";
import { getPlatformStats } from "@/actions/stats";

export async function GET() {
  try {
    const data = await getPlatformStats();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
