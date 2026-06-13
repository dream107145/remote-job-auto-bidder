import { NextResponse, type NextRequest } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);

export function rateLimit(request: NextRequest): NextResponse | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return null;
  }

  if (entry.count >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetTime - now) / 1000)),
        },
      }
    );
  }

  entry.count++;
  return null;
}
