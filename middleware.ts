import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const LAST_PATH_COOKIE_PREFIX = "growship_lp_";
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const lastPathCookie = request.cookies.get(
      `${LAST_PATH_COOKIE_PREFIX}${user.id}`
    );
    const savedPath = lastPathCookie
      ? decodeURIComponent(lastPathCookie.value)
      : null;

    // Only redirect from root path, not from explicit dashboard navigation
    if (
      savedPath &&
      request.nextUrl.pathname === "/" &&
      savedPath !== request.nextUrl.pathname
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = savedPath;
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Allow access to auth pages (including password setup) without authentication
  const authPages = [
    "/auth/",
    "/auth/callback",
    "/auth/setup-password",
    "/auth/invite",
  ];
  const isAuthPage = authPages.some((page) =>
    request.nextUrl.pathname.startsWith(page)
  );

  // Allow authenticated users to access profile setup without additional DB queries
  if (user && request.nextUrl.pathname.startsWith("/profile/setup")) {
    return supabaseResponse;
  }

  // Define protected routes
  const protectedRoutes = [
    "/dashboard",
    "/profile",
    "/settings",
    "/users",
    "/sales",
    "/orders",
    "/purchase-orders",
    "/shipments",
    "/invoices",
    "/reports",
    "/financials",
    "/marketing",
    "/calendar",
    "/notifications",
    "/distributors",
    "/manufacturers",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Protect all app routes - redirect unauthenticated users to landing page
  if (!user && !isAuthPage && isProtectedRoute) {
    // No user, redirect to home page where they can choose their role
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // If user is authenticated and accessing protected routes, check if they need to complete setup
  if (
    user &&
    isProtectedRoute &&
    !request.nextUrl.pathname.startsWith("/profile/setup")
  ) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_profile_complete")
        .eq("user_id", user.id)
        .single();

      // If there's an error fetching profile, allow access but log it
      // This prevents redirect loops if there's a temporary DB issue
      if (profileError) {
        console.error("[Middleware] Error checking profile:", {
          userId: user.id,
          error: profileError.message,
          path: request.nextUrl.pathname,
        });
        // Only redirect if it's a "not found" error, otherwise allow access
        if (profileError.code === "PGRST116") {
          // Profile not found - redirect to setup
          const url = request.nextUrl.clone();
          url.pathname = "/profile/setup";
          return NextResponse.redirect(url);
        }
        // For other errors, allow access to prevent loops
        return supabaseResponse;
      }

      // Only redirect if profile is explicitly incomplete
      // Use strict equality check to avoid issues with null/undefined
      if (!profile || profile.is_profile_complete === false) {
        const url = request.nextUrl.clone();
        url.pathname = "/profile/setup";
        return NextResponse.redirect(url);
      }

      // Profile is complete, allow access
    } catch (error) {
      console.error("[Middleware] Unexpected error checking profile:", {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
        path: request.nextUrl.pathname,
      });
      // On unexpected errors, allow access to prevent redirect loops
      // The client-side check will handle the redirect if needed
      return supabaseResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
