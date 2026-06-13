import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const authRoutes = ["/signin", "/signup", "/verify", "/reset-password"];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");
  const isApiRoute = pathname.startsWith("/api");

  if (!user && (isDashboardRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = profile?.role === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, is_banned")
      .eq("id", user.id)
      .single();

    if (profile?.is_banned) {
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      url.searchParams.set("error", "banned");
      return NextResponse.redirect(url);
    }

    if (profile?.role !== "admin" && !isApiRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (user && isDashboardRoute) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_banned")
      .eq("id", user.id)
      .single();

    if (profile?.is_banned) {
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      url.searchParams.set("error", "banned");
      return NextResponse.redirect(url);
    }
  }

  return response;
}
